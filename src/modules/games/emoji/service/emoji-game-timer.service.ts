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
} from "../model/emoji.messages";

export const EmojiTimerConfig = {
    PromptResponseTimeoutMs: 90 * 1000,
    VoteAnswersTimeoutMs: 60 * 1000,
    PromptVotesTimeoutMs: 90 * 1000,
    PGameRestartTimeoutMs: 30 * 1000,
};

interface TimerSubscription<T extends TimerSubscriptionMessage> {
    type: TimerMessageTypes;
    cancel: (msg: T) => void;
    isCompleted: () => boolean;
    dispose: () => void;
    result: Promise<{ msg: T; canceled: boolean }>;
    message: T;
}

export interface TimerCompletedState<T> {
    timeoutExpired: boolean;
    result: T;
}

type TimerSubscriptionLike = TimerSubscription<TimerSubscriptionMessage> | null;

@Injectable()
export class EmojiGameTimerService {
    private readonly gameSubscriptions: Map<string, TimerSubscriptionLike>;

    public constructor(private readonly logger: LoggerService) {
        this.gameSubscriptions = new Map<string, TimerSubscriptionLike>();
    }

    public async registerGame(game: GameState): Promise<boolean> {
        if (this.gameSubscriptions.has(game.guid))
            return false;
        this.gameSubscriptions.set(game.guid, null);
        return true;
    }

    public async queuePlayerPrompt(
        game: GameState,
        playerId: string
    ): Promise<TimerCompletedState<PlayerPromptExpired>> {
        return await this.queue(
            game,
            {
                type: TimerMessageTypes.PlayerPromptExpired,
                payload: { promptPlayerId: playerId },
            },
            EmojiTimerConfig.PromptResponseTimeoutMs
        );
    }

    public async dequeuePlayerPrompt(
        game: GameState,
        data: { playerId: string; promptText: string; promptSubject: string }
    ): Promise<boolean> {
        return await this.dequeue<TimerSubscriptionMessage>(game, {
            type: TimerMessageTypes.PlayerPromptExpired,
            payload: {
                promptPlayerId: data.playerId,
                promptText: data.promptText,
                promptSubject: data.promptSubject,
            },
        });
    }

    public async queuePlayerResponses(
        game: GameState
    ): Promise<TimerCompletedState<PlayerResponsesExpired>> {
        return await this.queue(
            game,
            {
                type: TimerMessageTypes.PlayerResponsesExpired,
                payload: { responses: [] },
            },
            EmojiTimerConfig.PromptResponseTimeoutMs
        );
    }

    public async dequeuePlayerResponse(
        game: GameState,
        playersCount: number,
        playerId: string,
        playerJoinId: number,
        responseEmoji: string[]
    ): Promise<boolean> {
        const subscription = this.gameSubscriptions.get(game.guid);
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

        return await this.dequeue<PlayerResponsesExpired>(game, subState);
    }

    public async queuePlayerVotes(
        game: GameState
    ): Promise<TimerCompletedState<PlayerVotesExpired>> {
        return this.queue(
            game,
            {
                type: TimerMessageTypes.PlayerVotesExpired,
                payload: { responses: [] },
            },
            EmojiTimerConfig.PromptVotesTimeoutMs
        );
    }

    public async dequeuePlayerVotes(
        game: GameState,
        playersCount: number,
        playerId: string,
        votesForPlayers: { [playerId: string]: number }
    ): Promise<boolean> {
        const subscription = this.gameSubscriptions.get(game.guid);
        if (subscription?.type !== TimerMessageTypes.PlayerVotesExpired)
            return false;

        const state = subscription.message;
        if (state.type !== TimerMessageTypes.PlayerVotesExpired) return false;

        const { responses } = state.payload;
        if (!responses.some((entry) => entry.playerId === playerId)) {
            responses.push({ playerId, playerIdVotes: votesForPlayers });
        }
        if (responses.length < playersCount) return true;

        return await this.dequeue<PlayerVotesExpired>(game, state);
    }

    public async queueGameRestart(
        game: GameState
    ): Promise<TimerCompletedState<GameRestartExpired>> {
        return await this.queue(
            game,
            {
                type: TimerMessageTypes.GameRestartExpired,
                payload: {},
            },
            EmojiTimerConfig.PGameRestartTimeoutMs
        );
    }

    public releaseGame(game: GameState) {
        const handle = this.gameSubscriptions.get(game.guid);
        if (handle) {
            handle.dispose();
        }
        this.gameSubscriptions.delete(game.guid);
    }

    private async queue<T extends TimerSubscriptionMessage>(
        game: GameState,
        timeoutMessage: T,
        durationMs: number
    ): Promise<{ timeoutExpired: boolean; result: T }> {
        const previousTimer = this.getSubscription(game);
        if (previousTimer && !previousTimer.isCompleted()) {
            this.logger.info(
                `disposing running ${previousTimer.type} timer on game ${game.guid}`
            );
            previousTimer.dispose();
        }

        const subscription = this.startTimer(timeoutMessage, durationMs);
        this.gameSubscriptions.set(game.guid, subscription);

        const resp = await subscription.result;
        const timeoutExpired = !resp.canceled;
        return { timeoutExpired, result: resp.msg };
    }

    private async dequeue<T extends TimerSubscriptionMessage>(
        game: GameState,
        cancelMessage: T
    ): Promise<boolean> {
        const subscription = this.gameSubscriptions.get(game.guid);
        if (!subscription || subscription.type !== cancelMessage.type)
            return false;

        subscription.cancel(cancelMessage);
        this.gameSubscriptions.set(game.guid, null);

        await subscription.result;
        return true;
    }

    private getSubscription(game: GameState) {
        return this.gameSubscriptions.get(game.guid);
    }

    private startTimer<T extends TimerSubscriptionMessage>(
        defaultMsg: T,
        durationMs: number
    ): TimerSubscription<T> {
        const state = {
            completed: false,
            canceled: false,
            timerHandle: null as number | null,
            taskDoneCallback: (msg: T) => {},
            msg: EmojiGameTimerService.jsonClone(defaultMsg) as T | null,
        };
        const setHandle = (handle: number | null): void => {
            state.timerHandle = handle;
        };
        const setTaskDoneCallback = (newFn: (msg: T) => void): void => {
            state.taskDoneCallback = newFn;
        };
        const setAsComplete = (): void => {
            state.completed = true;
        };
        const setAsCanceled = (): void => {
            state.canceled = true;
        };
        const dispose = () => {
            if (state.canceled) return;
            state.msg = null;
            setAsCanceled();
            if (state.timerHandle) {
                clearTimeout(state.timerHandle);
                setHandle(null);
            }
        };
        const promise = new Promise<{ msg: T; canceled: boolean }>((res) => {
            setHandle(
                setTimeout(() => {
                    setAsComplete();
                    setHandle(null);
                    if (!state.canceled) {
                        res({ msg: state.msg || defaultMsg, canceled: false });
                    }
                }, durationMs) as any
            );

            setTaskDoneCallback((msg: T) => {
                if (!state.completed && !state.canceled && state.timerHandle) {
                    setAsCanceled();
                    setAsComplete();
                    clearTimeout(state.timerHandle);
                    setHandle(null);
                    res({ msg, canceled: true });
                }
            });
        });
        return {
            type: defaultMsg.type,
            cancel: (msg: T) => state.taskDoneCallback(msg),
            dispose: dispose,
            result: promise,
            isCompleted: () => state.completed,
            message: state.msg || defaultMsg,
        };
    }

    private static jsonClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }
}
