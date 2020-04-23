import { Injectable } from "@nestjs/common";
import { GameState } from "src/modules/common/model/GameState";
import { LoggerService } from "src/modules/common/provider";

export const EmojiTimerConfig = {
    PromptResponseTimeoutMs: 90 * 1000,
    VoteAnswersTimeoutMs: 3 * 1000,
};

export enum TimerMessageTypes {
    PlayerPromptExpired,
    PlayerResponseExpired,
}
type PlayerPromptExpired = {
    type: TimerMessageTypes.PlayerPromptExpired;
    payload: {
        promptPlayerId: string;
        promptText?: string;
    };
};
type PlayerResponseExpired = {
    type: TimerMessageTypes.PlayerResponseExpired;
    payload: {
        responses: { playerId: string; playerResponse: string }[];
    };
};
export type TimerSubscriptionMessage =
    | PlayerPromptExpired
    | PlayerResponseExpired;

interface TimerSubscription<T extends TimerSubscriptionMessage> {
    type: TimerMessageTypes;
    cancel: (msg: T) => void;
    isCompleted: () => boolean;
    handle: Promise<{ msg: T; canceled: boolean }>;
}

export interface TimerCompletedState<T> {
    timeoutExpired: boolean;
    result: T;
}

@Injectable()
export class EmojiGameTimerService {
    private readonly gameHandles: Map<
        string,
        TimerSubscription<TimerSubscriptionMessage> | null
    >;

    public constructor(private readonly logger: LoggerService) {}

    public async queuePlayerPrompt(
        game: GameState,
        playerId: string
    ): Promise<TimerCompletedState<PlayerPromptExpired>> {
        return this.queue(
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
        data: { playerId: string; promptText: string }
    ): Promise<boolean> {
        return await this.dequeue<TimerSubscriptionMessage>(game, {
            type: TimerMessageTypes.PlayerPromptExpired,
            payload: {
                promptPlayerId: data.playerId,
                promptText: data.promptText,
            },
        });
    }

    public async queuePlayerResponses(
        game: GameState
    ): Promise<TimerCompletedState<PlayerResponseExpired>> {
        return this.queue(
            game,
            {
                type: TimerMessageTypes.PlayerResponseExpired,
                payload: { responses: [] },
            },
            EmojiTimerConfig.PromptResponseTimeoutMs
        );
    }

    private async queue<T extends TimerSubscriptionMessage>(
        game: GameState,
        timeoutMessage: T,
        durationMs: number
    ): Promise<{ timeoutExpired: boolean; result: T }> {
        const previousTimer = this.getSubscription(game);
        if (previousTimer && !previousTimer.isCompleted())
            this.logger.info(`cancelling timer on game ${game.guid}`);

        const subscription = this.startTimer(timeoutMessage, durationMs);
        this.gameHandles.set(game.guid, subscription);

        const resp = await subscription.handle;
        const timeoutExpired = !resp.canceled;
        return { timeoutExpired, result: resp.msg };
    }

    private async dequeue<T extends TimerSubscriptionMessage>(
        game: GameState,
        cancelMessage: T
    ): Promise<boolean> {
        const subscription = this.gameHandles.get(game.guid);
        if (!subscription || subscription.type !== cancelMessage.type)
            return false;

        subscription.cancel(cancelMessage);
        this.gameHandles.set(game.guid, null);

        await subscription.handle;
        return true;
    }

    private getSubscription(game: GameState) {
        return this.gameHandles.get(game.guid);
    }

    private startTimer<T extends TimerSubscriptionMessage>(
        defaultMsg: T,
        durationMs: number
    ): TimerSubscription<T> {
        let callback = (msg: T) => {};
        const state = {
            completed: false,
            canceled: false,
            timerHandle: null as number | null,
        };

        const promise = new Promise<{
            msg: T;
            canceled: boolean;
        }>((res) => {
            state.timerHandle = (setTimeout(() => {
                state.completed = true;
                state.timerHandle = null;
                res({ msg: defaultMsg, canceled: false });
            }, durationMs) as any) as number;

            callback = (msg: T) => {
                if (!state.completed && state.timerHandle) {
                    state.completed = true;
                    state.canceled = true;
                    clearTimeout(state.timerHandle);
                    state.timerHandle = null;
                    res({ msg, canceled: true });
                }
            };
        });
        return {
            type: defaultMsg.type,
            cancel: (msg: T) => callback(msg),
            handle: promise,
            isCompleted: () => state.completed,
        };
    }
}
