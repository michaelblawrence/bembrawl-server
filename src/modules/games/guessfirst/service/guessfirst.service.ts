import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../../common/provider";

import { GameState } from "src/modules/common/model/GameState";
import { GuessFirstGameTimerService } from "./guessfirst-game-timer.service";
import { PlayersState } from "src/modules/common/model/PlayersState";
import { GuessFirstMessagingService } from "./guessfirst-messaging.service";
import { GameStateService } from "src/modules/common/service";
import { GuessFirstGameLogicService } from "./guessfirst-game-logic.service";
import { PromptMatchReq } from "../model";

export const GuessFirstServiceConfig = {
    ANSWERS_MAX_VOTES_COUNT: 3,
    ALLOW_PROMPT_PLAYER_TO_EMOJI: true,
};

class GuessFirstUtils {
    public static randomEntry<T>(entries: T[]): T {
        return entries[GuessFirstUtils.randomInt(entries.length)];
    }
    public static randomInt(
        maxExclusive: number,
        minInclusive: number = 0
    ): number {
        const randomRange = Math.random() * (maxExclusive - minInclusive);
        const adjusted = Math.floor(randomRange + minInclusive);
        return Math.min(adjusted, maxExclusive - 1);
    }
}
@Injectable()
export class GuessFirstService {
    public constructor(
        private readonly emojiMessagingService: GuessFirstMessagingService,
        private readonly emojiGameTimerService: GuessFirstGameTimerService,
        private readonly emojiGameLogicService: GuessFirstGameLogicService,
        private readonly gameStateService: GameStateService,
        private readonly logger: LoggerService
    ) {}

    public register(game: GameState): boolean {
        if (!game.closed()) {
            this.logger.info(`game room ${game.guid} is not yet closed/ready`);
            return false;
        }
        if (!this.emojiGameTimerService.registerGame(game)) {
            this.logger.info(
                `game room ${game.guid} has already been registered`
            );
            return false;
        }
        const _ = this.start(game);
        return true;
    }

    public async playerPromptReceived(
        sessionId: string,
        promptText: string,
        promptSubject: string
    ): Promise<boolean> {
        const validated = await this.validateGamePlayer(sessionId);
        if (!validated.isValid) return false;
        return await this.emojiGameTimerService.dequeuePlayerPrompt(
            validated.game,
            {
                playerId: validated.player.deviceId,
                promptText,
                promptSubject,
            }
        );
    }

    public async playerPromptMatchReceived(
        sessionId: string,
        promptMatchReq: PromptMatchReq
    ): Promise<boolean> {
        const validated = await this.validateGamePlayer(sessionId);
        if (!validated.isValid) return false;
        return await this.emojiGameTimerService.dequeuePlayerMatchPrompt(
            validated.game,
            {
                playerId: validated.player.deviceId,
                promptText: promptMatchReq.promptAnswer,
                promptSubject: promptMatchReq.promptSubject,
                promptEmoji: promptMatchReq.promptEmoji,
            }
        );
    }

    public async playerResponseReceived(
        sessionId: string,
        responseEmoji: string[]
    ): Promise<boolean> {
        const validated = await this.validateGamePlayer(sessionId);
        if (!validated.isValid) return false;
        // TODO: validate emoji string

        const playerCount = Object.entries(validated.game.players).length;
        return await this.emojiGameTimerService.dequeuePlayerResponse(
            validated.game,
            playerCount,
            validated.player.deviceId,
            validated.game.getFormattedPlayerIndex(validated.player.deviceId),
            responseEmoji
        );
    }

    public async playerVoteReceived(
        sessionId: string,
        votedPlayerIds: string[]
    ): Promise<boolean> {
        if (votedPlayerIds.length > GuessFirstServiceConfig.ANSWERS_MAX_VOTES_COUNT)
            return false;
        const validated = await this.validateGamePlayer(sessionId);
        if (!validated.isValid) return false;

        this.logger.info(
            `game ${validated.game.guid} votes player id = ${
                validated.player.deviceId
            } summary: ${JSON.stringify(votedPlayerIds)}`
        );
        const players = Object.values(validated.game.players);
        const playersVotes = players.reduce<{ [playerId: string]: number }>(
            (a, c) => {
                a[c.deviceId] =
                    (a[c.deviceId] || 0) +
                    votedPlayerIds.filter((id) => id === c.deviceId).length;
                return a;
            },
            {}
        );
        const expectedResponseCount = GuessFirstServiceConfig.ALLOW_PROMPT_PLAYER_TO_EMOJI
            ? players.length
            : players.length - 1;

        return await this.emojiGameTimerService.dequeuePlayerVotes(
            validated.game,
            expectedResponseCount,
            validated.player.deviceId,
            playersVotes
        );
    }

    private async start(game: GameState) {
        const players = Object.entries(game.players);
        this.logger.info(
            `game room = ${game.joinId} is starting game loop with ${players.length} players`
        );
        while (game.hasAnyPlayers()) {
            await this.gameLoop(players, game);
        }
        this.emojiGameTimerService.releaseGame(game);
        this.logger.info(
            `game room = ${game.joinId} has ended game loop and cleaned up`
        );
    }

    private async gameLoop(
        playersKvp: [string, PlayersState][],
        game: GameState
    ) {
        const [startingPlayerId, startingPlayer] = GuessFirstUtils.randomEntry(
            playersKvp
        );

        await this.emojiMessagingService.dispatchGameStart(
            game,
            startingPlayerId,
            game.getPlayerJoinOrder(startingPlayer.deviceId) || -1,
            game.getPlayerName(startingPlayerId),
            GuessFirstServiceConfig.ALLOW_PROMPT_PLAYER_TO_EMOJI
        );

        const playerPrompting = await this.emojiGameLogicService.runPlayerPrompting(
            game,
            startingPlayerId
        );
        if (!playerPrompting.success) return;

        const playerResponses = await this.emojiGameLogicService.runPlayerResponses(
            game,
            startingPlayerId,
            playerPrompting.promptText,
            playerPrompting.promptSubject
        );
        if (!playerResponses.success) return;

        const playerVotes = await this.emojiGameLogicService.runPlayerVotes(
            game,
            startingPlayerId,
            playerPrompting.promptText
        );
        if (!playerVotes.success) return;

        await this.emojiGameTimerService.queueGameRestart(game);
    }

    private async validateGamePlayer(
        sessionId: string
    ): Promise<
        | { isValid: true; player: PlayersState; game: GameState }
        | { isValid: false; player?: null; game?: null }
    > {
        const player = await this.gameStateService.getPlayer(sessionId);
        const gameGuid = player && player.getGameGuid();
        if (!player || !gameGuid) {
            this.logger.info("playerPromptReceived => error invalid player");
            return { isValid: false };
        }
        const game = await this.gameStateService.getGame(gameGuid);
        if (!game) {
            this.logger.info("playerPromptReceived => error invalid game");
            return { isValid: false };
        }
        return { isValid: true, player, game };
    }
}
