import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../../common/provider";

import { GameState } from "src/modules/common/model/GameState";
import { EmojiGameTimerService } from "./emoji-game-timer.service";
import { PlayersState } from "src/modules/common/model/PlayersState";
import { EmojiMessagingService } from "./emoji.messaging.service";
import { GameStateService } from "src/modules/common/service";
import { PlayerVotesResponse, PlayerVotesTally } from "../model/emoji.messages";
import { PlayerVotingResult } from "src/modules/common/model/Message";

export const EmojiServiceConfig = {
    ANSWERS_MAX_VOTES_COUNT: 3,
};

class EmojiUtils {
    public static randomEntry<T>(entries: T[]): T {
        return entries[EmojiUtils.randomInt(entries.length)];
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
export class EmojiService {
    public constructor(
        private readonly emojiMessagingService: EmojiMessagingService,
        private readonly emojiGameTimerService: EmojiGameTimerService,
        private readonly gameStateService: GameStateService,
        private readonly logger: LoggerService
    ) {}

    public register(game: GameState) {
        if (!game.closed) {
            this.logger.info(`game room ${game.guid} is not yet closed/ready`);
        }
        this.start(game);
    }

    public async playerPromptReceived(
        sessionId: string,
        promptText: string
    ): Promise<boolean> {
        const validated = await this.validateGamePlayer(sessionId);
        if (!validated.isValid) return false;
        return await this.emojiGameTimerService.dequeuePlayerPrompt(
            validated.game,
            {
                playerId: validated.player.deviceId,
                promptText,
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
            responseEmoji
        );
    }

    public async playerVoteReceived(
        sessionId: string,
        votedPlayerIds: string[]
    ): Promise<boolean> {
        if (votedPlayerIds.length > EmojiServiceConfig.ANSWERS_MAX_VOTES_COUNT)
            return false;
        const validated = await this.validateGamePlayer(sessionId);
        if (!validated.isValid) return false;

        const players = Object.values(validated.game.players);
        const playersVotes = players.reduce<{ [playerId: string]: number }>(
            (a, c) => {
                a[c.deviceId] = (a[c.deviceId] || 0) + 1;
                return a;
            },
            {}
        );
        return await this.emojiGameTimerService.dequeuePlayerVotes(
            validated.game,
            players.length,
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
        const [startingPlayerId] = EmojiUtils.randomEntry(playersKvp);

        await this.emojiMessagingService.dispatchGameStart(
            game,
            startingPlayerId
        );
        
        const playerPrompting = await this.runPlayerPrompting(
            game,
            startingPlayerId
        );
        if (!playerPrompting.success) return;

        const playerResponses = await this.runPlayerResponses(
            game,
            startingPlayerId,
            playerPrompting.promptText
        );
        if (!playerResponses.success) return;

        const playerVotes = await this.runPlayerVotes(
            game,
            startingPlayerId,
            playerPrompting.promptText
        );
        if (!playerVotes.success) return;
    }

    private async runPlayerPrompting(
        game: GameState,
        startingPlayerId: string
    ): Promise<{ success: false } | { success: true; promptText: string }> {
        await this.emojiMessagingService.dispatchGameStart(
            game,
            startingPlayerId
        );
        const playerPrompt = await this.emojiGameTimerService.queuePlayerPrompt(
            game,
            startingPlayerId
        );

        const { promptText } = playerPrompt.result.payload;
        if (playerPrompt.timeoutExpired || !promptText) {
            this.logger.info("round expired on player prompt");
            return { success: false };
        }
        await this.emojiMessagingService.dispatchNewPrompt(
            game,
            startingPlayerId,
            promptText
        );
        return { success: true, promptText };
    }

    private async runPlayerResponses(
        game: GameState,
        startingPlayerId: string,
        promptText: string
    ): Promise<{ success: false } | { success: true }> {
        const playerResponses = await this.emojiGameTimerService.queuePlayerResponses(
            game
        );
        const { responses } = playerResponses.result.payload;
        if (playerResponses.timeoutExpired || responses.length === 0) {
            this.logger.info("round expired on player responses");
            return { success: false };
        }
        await this.emojiMessagingService.dispatchPlayerResponses(
            game,
            startingPlayerId,
            promptText,
            responses
        );
        return { success: true };
    }

    private async runPlayerVotes(
        game: GameState,
        startingPlayerId: string,
        promptText: string
    ) {
        const playerResponses = await this.emojiGameTimerService.queuePlayerVotes(
            game
        );
        const { responses } = playerResponses.result.payload;
        if (playerResponses.timeoutExpired || responses.length === 0) {
            this.logger.info("round expired on player responses");
            return { success: false };
        }
        const scores = this.computePlayerScores(responses, game);

        await this.emojiMessagingService.dispatchPlayerScores(
            game,
            startingPlayerId,
            promptText,
            scores
        );
        return { success: true };
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

    private computePlayerScores(
        responses: PlayerVotesResponse[],
        game: GameState
    ): PlayerVotingResult[] {
        const allVotesSummed = responses.reduce<PlayerVotesTally>((a, c) => {
            a[c.playerId] =
                (a[c.playerId] || 0) + (c.playerIdVotes[c.playerId] || 0);
            return a;
        }, {});
        const scores = Object.entries(allVotesSummed)
            .sort((a, b) => b[1] - a[1])
            .map<PlayerVotingResult>(([playerId, voteCount]) => ({
                playerId,
                playerName:
                    game.getPlayerName(playerId) ||
                    "Player " + ((game.getPlayerJoinOrder(playerId) || -1) + 1),
                voteCount,
            }));
        return scores;
    }
}
