import { GameState } from "src/modules/common/model/GameState";
import { LoggerService } from "src/modules/common/provider";

export const EmojiTimerConfig = {
    PromptResponseTimeoutMs: 90 * 1000,
    VoteAnswersTimeoutMs: 60 * 1000,
    PromptVotesTimeoutMs: 90 * 1000,
    PGameRestartTimeoutMs: 30 * 1000,
};

interface TimerSubscription<
    TMsgType,
    TMsg extends { type: TMsgType },
    T extends TMsg
> {
    type: TMsgType;
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

type TimerSubscriptionLike<
    TMsg extends { type: TMsgType },
    TMsgType
> = TimerSubscription<TMsgType, TMsg, TMsg> | null;

export class GameTimerProvider<TMsg extends { type: TMsgType }, TMsgType> {
    private readonly gameSubscriptions: Map<
        string,
        TimerSubscriptionLike<TMsg, TMsgType>
    >;

    public constructor(private readonly logger: LoggerService) {
        this.gameSubscriptions = new Map<
            string,
            TimerSubscriptionLike<TMsg, TMsgType>
        >();
    }

    public async registerGame(game: GameState): Promise<boolean> {
        if (this.getSubscription(game)) return false;
        this.setSubscription(game, null);
        return true;
    }

    public releaseGame(game: GameState) {
        this.setSubscription(game, null);
        this.deleteSubscription(game);
    }

    public async queue<T extends TMsg>(
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
        this.setSubscription(game, subscription);

        const resp = await subscription.result;
        const timeoutExpired = !resp.canceled;
        return { timeoutExpired, result: resp.msg };
    }

    public async dequeue<T extends TMsg>(
        game: GameState,
        cancelMessage: T
    ): Promise<boolean> {
        const subscription = this.getSubscription(game);
        if (!subscription || subscription.type !== cancelMessage.type)
            return false;

        subscription.cancel(cancelMessage);
        this.setSubscription(game, null);

        await subscription.result;
        return true;
    }

    public getSubscription(game: {
        guid: string;
    }): TimerSubscriptionLike<TMsg, TMsgType> {
        const subscription = this.gameSubscriptions.get(game.guid);
        return subscription || null;
    }

    public setSubscription(
        game: { guid: string },
        value: TimerSubscriptionLike<TMsg, TMsgType>
    ) {
        const subscription = this.getSubscription(game);
        if (subscription) subscription.dispose();
        this.gameSubscriptions.set(game.guid, value);
    }

    public deleteSubscription(game: GameState) {
        this.gameSubscriptions.delete(game.guid);
    }

    public startTimer<T extends TMsg>(
        defaultMsg: T,
        durationMs: number
    ): TimerSubscription<TMsgType, TMsg, T> {
        const state = {
            completed: false,
            canceled: false,
            timerHandle: null as number | null,
            taskDoneCallback: (_msg: T) => {},
            msg: GameTimerProvider.jsonClone(defaultMsg) as T | null,
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
