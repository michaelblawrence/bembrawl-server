import { Injectable } from "@nestjs/common";
import { DateTimeProvider } from "../../../common/service/date-time-provider";
import { GameMessagingService } from "src/modules/common/service/game-messaging.service";
import { GameState } from "src/modules/common/model/GameState";
import {
    MessageTypes,
    EmojiGameStartedMessage,
    EmojiNewPromptMessage,
    EmojiAllResponsesMessage,
    EmojiVotingResultsMessage,
    PlayerVotingResult,
    PlayerEmojiResponse,
    EmojiMatchPromptMessage,
} from "src/modules/common/model/server.types";

@Injectable()
export class EmojiMessagingService {
    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameMessagingService: GameMessagingService
    ) {}

    public async dispatchGameStart(
        game: GameState,
        promptPlayerId: string,
        promptPlayerJoinId: number,
        promptPlayerName: string,
        promptPlayerAnswersEmoji: boolean
    ): Promise<void> {
        const msg: EmojiGameStartedMessage = {
            type: MessageTypes.EMOJI_GAME_STARTED,
            payload: {
                gameStartTimeMs: this.dateTimeProviderService.getTime(),
                initialPromptPlayer: {
                    playerId: promptPlayerId,
                    playerJoinId: promptPlayerJoinId,
                    playerName: promptPlayerName
                },
                promptPlayerAnswersEmoji
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }

    public async dispatchNewPrompt(
        game: GameState,
        promptPlayerId: string,
        promptText: string,
        promptSubject: string,
        timeoutMs: number,
    ): Promise<void> {
        const msg: EmojiNewPromptMessage = {
            type: MessageTypes.EMOJI_NEW_PROMPT,
            payload: {
                promptText: promptText,
                promptSubject: promptSubject,
                promptFromPlayerId: promptPlayerId,
                timeoutMs: timeoutMs,
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }

    public async dispatchMatchPrompt(
        game: GameState,
        promptPlayerId: string,
        promptText: string,
        promptSubject: string,
        promptEmoji: string,
        timeoutMs: number,
    ): Promise<void> {
        const msg: EmojiMatchPromptMessage = {
            type: MessageTypes.EMOJI_MATCH_PROMPT,
            payload: {
                promptText: promptText,
                promptSubject: promptSubject,
                promptFromPlayerId: promptPlayerId,
                promptEmoji: promptEmoji,
                timeoutMs: timeoutMs,
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }

    public async dispatchPlayerResponses(
        game: GameState,
        promptPlayerId: string,
        promptText: string,
        promptSubject: string,
        emojiResponses: PlayerEmojiResponse[],
    ): Promise<void> {
        const msg: EmojiAllResponsesMessage = {
            type: MessageTypes.EMOJI_ALL_RESPONSES,
            payload: {
                promptText: promptText,
                promptSubject: promptSubject,
                promptFromPlayerId: promptPlayerId,
                emojiResponses: emojiResponses
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }

    public async dispatchPlayerScores(
        game: GameState,
        promptPlayerId: string,
        promptText: string,
        scores: PlayerVotingResult[],
    ): Promise<void> {
        const msg: EmojiVotingResultsMessage = {
            type: MessageTypes.EMOJI_VOTING_RESULTS,
            payload: {
                promptText: promptText,
                promptFromPlayerId: promptPlayerId,
                votes: scores
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }
}
