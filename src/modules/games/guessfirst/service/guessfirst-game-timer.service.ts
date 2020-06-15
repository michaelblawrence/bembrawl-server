import { Injectable } from "@nestjs/common";
import { GameState } from "src/modules/common/model/GameState";
import { LoggerService } from "src/modules/common/provider";
import {
    TimerSubscriptionMessage,
    TimerMessageTypes,
    PlayerResponsesExpired,
    GameRestartExpired,
    PlayerMatchPromptExpired,
} from "../model/guessfirst.messages";
import {
    GameTimerProvider,
    TimerCompletedState,
} from "../../../common/service/game-timer.provider";
import { PlayersState } from "src/modules/common/model/PlayersState";

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

    public async queuePlayerMatchPrompt(
        game: GameState,
        playerId: string
    ): Promise<TimerCompletedState<PlayerMatchPromptExpired>> {
        return await this.timerProvider.queue(
            game,
            {
                type: TimerMessageTypes.PlayerMatchPromptExpired,
                payload: { promptPlayerId: playerId, promptEmoji: [] },
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
            promptEmoji: string[];
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
        game: GameState,
        promptSubject: string,
        promptPlayerId: string,
        validAnswer: string
    ): Promise<TimerCompletedState<PlayerResponsesExpired>> {
        return await this.timerProvider.queue(
            game,
            {
                type: TimerMessageTypes.PlayerResponsesExpired,
                payload: { responses: [], promptSubject, validAnswer, promptPlayerId },
            },
            GuessFirstTimerConfig.PromptResponseTimeoutMs
        );
    }

    public async dequeuePlayerResponse(
        game: GameState,
        player: PlayersState,
        playerJoinId: number,
        incomingSubject: string,
        pendingAnswer: string
    ): Promise<boolean> {
        const subscription = this.timerProvider.getSubscription(game);
        if (subscription?.type !== TimerMessageTypes.PlayerResponsesExpired)
            return false;

        const subState = subscription.message;
        if (subState.type !== TimerMessageTypes.PlayerResponsesExpired)
            return false;

        const { responses, validAnswer, promptSubject, promptPlayerId } = subState.payload;
        const expectedCount = game.getPlayerCount() - 1;
        const playerId = player.deviceId;
        if (playerId === promptPlayerId) return false;
        if (promptSubject !== incomingSubject) return false;

        if (!this.compareResponseAnswer(validAnswer, pendingAnswer)) {
            this.logger.error(
                `answer validation failed: guess='${[pendingAnswer]}' ` +
                    `does not match correct answer='${validAnswer}'`
            );
            return false;
        }
        if (!responses.some((entry) => entry.playerId === playerId)) {
            responses.push({
                playerId,
                playerJoinId,
                correctAnswer: pendingAnswer,
            });
        }
        this.logger.info(
            `game ${game.joinId} responses/expected = ${responses.length}/${expectedCount}`
        );

        if (responses.length < expectedCount) return true;
        this.logger.info(
            `game ${game.joinId} ok we've got all responses back, dequeuing`
        );

        return await this.timerProvider.dequeue<PlayerResponsesExpired>(
            game,
            subState
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

    public async dequeueGameRestart(game: GameState): Promise<boolean> {
        return await this.timerProvider.dequeue<GameRestartExpired>(game, {
            type: TimerMessageTypes.GameRestartExpired,
            payload: {},
        });
    }

    private compareResponseAnswer(expected: string, observed: string) {
        const normalize = (str: string) => str.toLocaleLowerCase().trim();
        return normalize(expected) === normalize(observed);
    }
}
