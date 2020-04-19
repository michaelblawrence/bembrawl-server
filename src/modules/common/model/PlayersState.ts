import { DateTimeProvider } from "../service/date-time-provider";

export class PlayersState {
    private lastKeepAliveDtMs: number;
    private gameGuid: string;
    public readonly createdAtDtMs: number;

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

    public getGameGuid(): string {
        return this.gameGuid;
    }
}
