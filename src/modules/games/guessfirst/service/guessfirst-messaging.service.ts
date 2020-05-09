import { Injectable } from "@nestjs/common";
import { DateTimeProvider } from "../../../common/service/date-time-provider";
import { GameMessagingService } from "src/modules/common/service/game-messaging.service";
import { GameState } from "src/modules/common/model/GameState";
import {
    MessageTypes,
    GuessFirstGameStartedMessage,
    GuessFirstNewPromptMessage,
    GuessFirstAllResponsesMessage,
    GuessFirstVotingResultsMessage,
    PlayerVotingResult,
    PlayerEmojiResponse,
    GuessFirstMatchPromptMessage,
    GuessFirstWrongAnswerMessage,
    PlayerCorrectGuessResponse,
} from "src/modules/common/model/server.types";

@Injectable()
export class GuessFirstMessagingService {
    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameMessagingService: GameMessagingService
    ) {}

    public async dispatchGameStart(
        game: GameState,
        promptPlayerId: string,
        promptPlayerJoinId: number,
        promptPlayerName: string | null,
    ): Promise<void> {
        const msg: GuessFirstGameStartedMessage = {
            type: MessageTypes.GUESS_FIRST_GAME_STARTED,
            payload: {
                gameStartTimeMs: this.dateTimeProviderService.getTime(),
                initialPromptPlayer: {
                    playerId: promptPlayerId,
                    playerJoinId: promptPlayerJoinId,
                    playerName: promptPlayerName
                },
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
        const msg: GuessFirstNewPromptMessage = {
            type: MessageTypes.GUESS_FIRST_NEW_PROMPT,
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
        const msg: GuessFirstMatchPromptMessage = {
            type: MessageTypes.GUESS_FIRST_MATCH_PROMPT,
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
        correctResponses: PlayerCorrectGuessResponse[],
    ): Promise<void> {
        const msg: GuessFirstAllResponsesMessage = {
            type: MessageTypes.GUESS_FIRST_ALL_RESPONSES,
            payload: {
                promptText: promptText,
                promptSubject: promptSubject,
                promptFromPlayerId: promptPlayerId,
                correctResponses: correctResponses
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }

    public async dispatchIncorrectGuessResponse(
        game: GameState,
        promptText: string,
        playerName: string,
        incorrectGuess: string,
    ): Promise<void> {
        const msg: GuessFirstWrongAnswerMessage = {
            type: MessageTypes.GUESS_FIRST_WRONG_ANSWER,
            payload: {
                promptText: promptText,
                playerName: playerName,
                incorrectGuess: incorrectGuess
            },
        };
        await this.gameMessagingService.dispatchHost(game, msg);
    }

    public async dispatchPlayerScores(
        game: GameState,
        promptPlayerId: string,
        promptText: string,
        scores: PlayerVotingResult[],
    ): Promise<void> {
        const msg: GuessFirstVotingResultsMessage = {
            type: MessageTypes.GUESS_FIRST_VOTING_RESULTS,
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
