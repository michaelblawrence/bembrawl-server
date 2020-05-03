import { Injectable } from "@nestjs/common";
import { GameState } from "src/modules/common/model/GameState";
import { LoggerService } from "src/modules/common/provider";
import {
    TimerSubscriptionMessage,
    TimerMessageTypes,
    PlayerPromptExpired,
    PlayerResponsesExpired,
    PlayerVotesExpired,
    GameRestartExpired,
    PlayerMatchPromptExpired,
} from "../model/guessfirst.messages";
import { GameTimerProvider, TimerCompletedState } from "../../../common/service/game-timer.provider";

export const GuessFirstTimerConfig = {
    PromptResponseTimeoutMs: 90 * 1000,
    VoteAnswersTimeoutMs: 60 * 1000,
    PromptVotesTimeoutMs: 90 * 1000,
    PGameRestartTimeoutMs: 30 * 1000,
};

@Injectable()
export class GuessFirstGameTimerProvider extends GameTimerProvider<
    TimerSubscriptionMessage,
    TimerMessageTypes
> {}

@Injectable()
export class GuessFirstGameTimerService {
    public constructor(
        private readonly timerProvider: GuessFirstGameTimerProvider,
        private readonly logger: LoggerService
    ) {}

    public async registerGame(game: GameState): Promise<boolean> {
        return this.timerProvider.registerGame(game);
    }
    public async releaseGame(game: GameState) {
        this.timerProvider.releaseGame(game);
    }

    public async queuePlayerPrompt(
        game: GameState,
        playerId: string
    ): Promise<TimerCompletedState<PlayerPromptExpired>> {
        return await this.timerProvider.queue(
            game,
            {
                type: TimerMessageTypes.PlayerPromptExpired,
                payload: { promptPlayerId: playerId },
            },
            GuessFirstTimerConfig.PromptResponseTimeoutMs
        );
    }

    public async dequeuePlayerPrompt(
        game: GameState,
        data: { playerId: string; promptText: string; promptSubject: string }
    ): Promise<boolean> {
        return await this.timerProvider.dequeue<TimerSubscriptionMessage>(
            game,
            {
                type: TimerMessageTypes.PlayerPromptExpired,
                payload: {
                    promptPlayerId: data.playerId,
                    promptText: data.promptText,
                    promptSubject: data.promptSubject,
                },
            }
        );
    }

    public async queuePlayerMatchPrompt(
        game: GameState,
        playerId: string
    ): Promise<TimerCompletedState<PlayerMatchPromptExpired>> {
        return await this.timerProvider.queue(
            game,
            {
                type: TimerMessageTypes.PlayerMatchPromptExpired,
                payload: { promptPlayerId: playerId },
            },
            GuessFirstTimerConfig.PromptResponseTimeoutMs
        );
    }

    public async dequeuePlayerMatchPrompt(
        game: GameState,
        data: {
            playerId: string;
            promptText: string;
            promptSubject: string;
            promptEmoji: string;
        }
    ): Promise<boolean> {
        return await this.timerProvider.dequeue<TimerSubscriptionMessage>(
            game,
            {
                type: TimerMessageTypes.PlayerMatchPromptExpired,
                payload: {
                    promptPlayerId: data.playerId,
                    promptText: data.promptText,
                    promptSubject: data.promptSubject,
                    promptEmoji: data.promptEmoji,
                },
            }
        );
    }

    public async queuePlayerResponses(
        game: GameState
    ): Promise<TimerCompletedState<PlayerResponsesExpired>> {
        return await this.timerProvider.queue(
            game,
            {
                type: TimerMessageTypes.PlayerResponsesExpired,
                payload: { responses: [] },
            },
            GuessFirstTimerConfig.PromptResponseTimeoutMs
        );
    }

    public async dequeuePlayerResponse(
        game: GameState,
        playersCount: number,
        playerId: string,
        playerJoinId: number,
        responseEmoji: string[]
    ): Promise<boolean> {
        const subscription = this.timerProvider.getSubscription(game);
        if (subscription?.type !== TimerMessageTypes.PlayerResponsesExpired)
            return false;

        const subState = subscription.message;
        if (subState.type !== TimerMessageTypes.PlayerResponsesExpired)
            return false;

        const { responses } = subState.payload;
        if (!responses.some((entry) => entry.playerId === playerId)) {
            responses.push({ playerId, playerJoinId, responseEmoji });
        }
        this.logger.info(
            `game ${game.joinId} responses/players = ${responses.length}/${playersCount}`
        );

        if (responses.length < playersCount) return true;
        this.logger.info(
            `game ${game.joinId} ok we've got all responses back, dequeuing`
        );

        return await this.timerProvider.dequeue<PlayerResponsesExpired>(
            game,
            subState
        );
    }

    public async queuePlayerVotes(
        game: GameState
    ): Promise<TimerCompletedState<PlayerVotesExpired>> {
        return this.timerProvider.queue(
            game,
            {
                type: TimerMessageTypes.PlayerVotesExpired,
                payload: { responses: [] },
            },
            GuessFirstTimerConfig.PromptVotesTimeoutMs
        );
    }

    public async dequeuePlayerVotes(
        game: GameState,
        playersCount: number,
        playerId: string,
        votesForPlayers: { [playerId: string]: number }
    ): Promise<boolean> {
        const subscription = this.timerProvider.getSubscription(game);
        if (subscription?.type !== TimerMessageTypes.PlayerVotesExpired)
            return false;

        const state = subscription.message;
        if (state.type !== TimerMessageTypes.PlayerVotesExpired) return false;

        const { responses } = state.payload;
        if (!responses.some((entry) => entry.playerId === playerId)) {
            responses.push({ playerId, playerIdVotes: votesForPlayers });
        }
        if (responses.length < playersCount) return true;

        return await this.timerProvider.dequeue<PlayerVotesExpired>(
            game,
            state
        );
    }

    public async queueGameRestart(
        game: GameState
    ): Promise<TimerCompletedState<GameRestartExpired>> {
        return await this.timerProvider.queue(
            game,
            {
                type: TimerMessageTypes.GameRestartExpired,
                payload: {},
            },
            GuessFirstTimerConfig.PGameRestartTimeoutMs
        );
    }
}
