import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../../common/provider";
import { GameState } from "src/modules/common/model/GameState";
import {
    EmojiGameTimerService,
    EmojiTimerConfig,
} from "./emoji-game-timer.service";
import { EmojiMessagingService } from "./emoji-messaging.service";
import { PlayerVotesResponse, PlayerVotesTally } from "../model/emoji.messages";
import { PlayerVotingResult } from "src/modules/common/model/server.types";
import { DateTimeProvider } from "src/modules/common/service";

export const EmojiGameLogicConfig = {};

type Fail = {
    success: false;
};

@Injectable()
export class EmojiGameLogicService {
    public constructor(
        private readonly dateTimeProvider: DateTimeProvider,
        private readonly emojiMessagingService: EmojiMessagingService,
        private readonly emojiGameTimerService: EmojiGameTimerService,
        private readonly logger: LoggerService
    ) {}

    public async runPlayerPrompting(
        game: GameState,
        startingPlayerId: string
    ): Promise<
        Fail | { success: true; promptText: string; promptSubject: string }
    > {
        const playerPrompt = await this.emojiGameTimerService.queuePlayerPrompt(
            game,
            startingPlayerId
        );
        const { promptText, promptSubject } = playerPrompt.result.payload;
        if (playerPrompt.timeoutExpired || !promptText || !promptSubject) {
            this.logger.info("round expired on player prompt");
            return { success: false };
        }

        const timeoutMs = this.dateTimeProvider.msAfter(
            EmojiTimerConfig.PromptResponseTimeoutMs
        );

        await this.emojiMessagingService.dispatchNewPrompt(
            game,
            startingPlayerId,
            promptText,
            promptSubject,
            timeoutMs
        );
        return { success: true, promptText, promptSubject };
    }

    public async runPlayerResponses(
        game: GameState,
        startingPlayerId: string,
        promptText: string,
        promptSubject: string
    ): Promise<Fail | { success: true }> {
        const playerResponses = await this.emojiGameTimerService.queuePlayerResponses(
            game
        );
        const { responses } = playerResponses.result.payload;
        if (playerResponses.timeoutExpired && responses.length === 0) {
            this.logger.info("round expired on player responses");
            return { success: false };
        }
        await this.emojiMessagingService.dispatchPlayerResponses(
            game,
            startingPlayerId,
            promptText,
            promptSubject,
            responses
        );
        return { success: true };
    }

    public async runPlayerVotes(
        game: GameState,
        startingPlayerId: string,
        promptText: string
    ): Promise<Fail | { success: true }> {
        const playerResponses = await this.emojiGameTimerService.queuePlayerVotes(
            game
        );
        const { responses } = playerResponses.result.payload;
        if (playerResponses.timeoutExpired && responses.length === 0) {
            this.logger.info("round expired on player responses");
            return { success: false };
        }
        const scores = this.computePlayerScores(responses, game);
        this.logger.info(`game ${game.guid} scores: ${JSON.stringify(scores)}`);
        await this.emojiMessagingService.dispatchPlayerScores(
            game,
            startingPlayerId,
            promptText,
            scores
        );
        return { success: true };
    }

    private computePlayerScores(
        responses: PlayerVotesResponse[],
        game: GameState
    ): PlayerVotingResult[] {
        const summed: PlayerVotesTally = {};
        for (const response of responses) {
            const votes = Object.entries(response.playerIdVotes);
            for (const [playerId, voteCount] of votes) {
                const startValue = summed[playerId] || 0;
                summed[playerId] = startValue + voteCount;
            }
        }
        this.logger.info(`game ${game.guid} votes: ${JSON.stringify(summed)}`);
        const scores = Object.entries(summed)
            .sort((a, b) => b[1] - a[1])
            .map<PlayerVotingResult>(([playerId, voteCount]) => ({
                playerId,
                playerName: game.getFormattedPlayerName(playerId),
                voteCount,
            }));
        return scores;
    }
}
