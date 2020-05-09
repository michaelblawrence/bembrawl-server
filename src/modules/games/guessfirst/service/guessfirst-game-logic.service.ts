import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../../common/provider";
import { GameState } from "src/modules/common/model/GameState";
import {
    GuessFirstGameTimerService,
    GuessFirstTimerConfig,
} from "./guessfirst-game-timer.service";
import { GuessFirstMessagingService } from "./guessfirst-messaging.service";
import {
    PlayerVotingResult,
    PlayerCorrectGuessResponse,
} from "src/modules/common/model/server.types";
import { DateTimeProvider } from "src/modules/common/service";

export const GuessFirstGameLogicConfig = {};

type Fail = {
    success: false;
};
type AsyncResult<T> = Promise<Fail | ({ success: true } & T)>;

@Injectable()
export class GuessFirstGameLogicService {
    public constructor(
        private readonly dateTimeProvider: DateTimeProvider,
        private readonly guessfirstMessagingService: GuessFirstMessagingService,
        private readonly guessfirstGameTimerService: GuessFirstGameTimerService,
        private readonly logger: LoggerService
    ) {}

    public async runPlayerPrompting(
        game: GameState,
        startingPlayerId: string
    ): Promise<
        Fail | { success: true; promptText: string; promptSubject: string; promptEmoji: string }
    > {
        const playerPrompt = await this.guessfirstGameTimerService.queuePlayerMatchPrompt(
            game,
            startingPlayerId
        );
        const {
            promptText,
            promptSubject,
            promptEmoji,
        } = playerPrompt.result.payload;
        if (playerPrompt.timeoutExpired || !promptText || !promptSubject) {
            this.logger.info("round expired on player prompt");
            return { success: false };
        }

        const timeoutMs = this.dateTimeProvider.msAfter(
            GuessFirstTimerConfig.PromptResponseTimeoutMs
        );

        await this.guessfirstMessagingService.dispatchMatchPrompt(
            game,
            startingPlayerId,
            promptText,
            promptSubject,
            promptEmoji || "",
            timeoutMs
        );
        return { success: true, promptText, promptSubject, promptEmoji: promptEmoji || "" };
    }

    public async runPlayerResponses(
        game: GameState,
        startingPlayerId: string,
        promptText: string,
        promptSubject: string,
        promptEmoji: string
    ): AsyncResult<{ responses: PlayerCorrectGuessResponse[] }> {
        const playerResponses = await this.guessfirstGameTimerService.queuePlayerResponses(
            game,
            promptEmoji,
            promptText
        );
        const { responses } = playerResponses.result.payload;
        if (playerResponses.timeoutExpired && responses.length === 0) {
            this.logger.info("round expired on player responses");
            return { success: false };
        }
        await this.guessfirstMessagingService.dispatchPlayerResponses(
            game,
            startingPlayerId,
            promptText,
            promptSubject,
            responses
        );
        return { success: true, responses };
    }

    public async runPlayerVotes(
        game: GameState,
        startingPlayerId: string,
        promptText: string,
        responses: PlayerCorrectGuessResponse[]
    ): Promise<Fail | { success: true }> {
        const scores = this.computePlayerScores(responses, game);
        this.logger.info(`game ${game.guid} scores: ${JSON.stringify(scores)}`);
        await this.guessfirstMessagingService.dispatchPlayerScores(
            game,
            startingPlayerId,
            promptText,
            scores
        );
        return { success: true };
    }

    private computePlayerScores(
        responses: PlayerCorrectGuessResponse[],
        game: GameState
    ): PlayerVotingResult[] {
        const players = Object.values(game.players);
        const playersCount = players.length;
        const mapped = players.reduce((votes, player, idx) => {
            const match = responses.find(
                (resp) => resp.playerId === player.deviceId
            );
            const playerName = game.getFormattedPlayerName(player.deviceId);
            if (!match)
                return votes.concat({
                    playerId: player.deviceId,
                    playerName,
                    voteCount: 0,
                });
            return votes.concat({
                playerId: player.deviceId,
                playerName,
                voteCount: playersCount - idx,
            });
        }, [] as PlayerVotingResult[]);
        const scores = mapped
            .slice()
            .sort((a, b) => b.voteCount[1] - a.voteCount[1]);
        return scores;
    }
}
