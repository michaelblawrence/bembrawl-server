import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../../common/provider";
import { GameState } from "src/modules/common/model/GameState";
import {
    EmojiGameTimerService,
    EmojiTimerConfig,
} from "./emoji-game-timer.service";
import { EmojiMessagingService } from "./emoji-messaging.service";
import { PlayerVotesResponse, PlayerVotesTally } from "../model/emoji.messages";
import { PlayerVotingResult } from "src/modules/common/model/Message";
import { DateTimeProvider } from "src/modules/common/service";

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
        | {
              success: false;
          }
        | {
              success: true;
              promptText: string;
          }
    > {
        await this.emojiMessagingService.dispatchGameStart(
            game,
            startingPlayerId,
            game.getPlayerName(startingPlayerId)
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

        const timeoutMs = this.dateTimeProvider.msAfter(EmojiTimerConfig.PromptResponseTimeoutMs)

        await this.emojiMessagingService.dispatchNewPrompt(
            game,
            startingPlayerId,
            promptText,
            timeoutMs
        );
        return { success: true, promptText };
    }

    public async runPlayerResponses(
        game: GameState,
        startingPlayerId: string,
        promptText: string
    ): Promise<
        | {
              success: false;
          }
        | {
              success: true;
          }
    > {
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

    public async runPlayerVotes(
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
