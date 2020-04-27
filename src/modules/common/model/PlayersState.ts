import { DateTimeProvider } from "../service/date-time-provider";
import { IKeepAlive } from "./IKeepAlive";

export class PlayersState implements IKeepAlive {
    public readonly createdAtDtMs: number;

    private lastKeepAliveDtMs: number;
    private gameGuid: string | null;
    private joinOrder: number | null = null;

    constructor(
        public readonly deviceId: string,
        public readonly sessionId: string,
        private readonly dateTimeProvider: DateTimeProvider
    ) {
        const nowDtMs = this.dateTimeProvider.getTime();
        this.lastKeepAliveDtMs = nowDtMs;
        this.createdAtDtMs = nowDtMs;
    }

    public keepAliveReceived() {
        this.lastKeepAliveDtMs = this.dateTimeProvider.getTime();
    }

    public getLastKeepAliveMs(): number {
        return this.lastKeepAliveDtMs;
    }

    public assignGame(gameGuid: string) {
        this.gameGuid = gameGuid;
    }

    public assignJoinOrder(joinOrder: number) {
        this.joinOrder = joinOrder;
    }

    /**
     * @deprecated this can be accessed on the GameState instead. Will be removed
     */
    public getJoinOrder(): number | null {
        return this.joinOrder;
    }

    public isMaster(): boolean {
        return this.joinOrder == 0;
    }

    public getGameGuid(): string | null {
        return this.gameGuid;
    }
}
