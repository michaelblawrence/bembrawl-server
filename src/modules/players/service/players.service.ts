import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../common/provider";

import { PlayersData, IPlayersData } from "../model/players.data";

export class PlayersState {
    public lastKeepAliveDtMs: number;
    public readonly createdAtDtMs: number;

    constructor(
        public readonly deviceId: string,
        public readonly sessionId: string
    ) {
        const nowDtMs = this.getTime();
        this.lastKeepAliveDtMs = nowDtMs;
        this.createdAtDtMs = nowDtMs;
    }

    public keepAliveReceived() {
        this.lastKeepAliveDtMs = this.getTime();
    }

    private getTime() {
        return Date.now();
    }
}

@Injectable()
export class PlayersService {
    private players: { [sessionId: string]: PlayersState } = {};

    public constructor(
        private readonly logger: LoggerService
    ) {}

    public async find(sessionId: string): Promise<IPlayersData> {
        const state = this.getPlayerState(sessionId);
        return { deviceId: state.deviceId, sessionId: state.sessionId };
    }

    public async create(input: PlayersData): Promise<IPlayersData> {
        const state = new PlayersState(input.deviceId, input.sessionId);
        this.setPlayerState(input, state);
        this.logger.info(JSON.stringify(this.players));
        return input;
    }

    public async keepAlive(sessionId: string): Promise<boolean> {
        const state = this.getPlayerState(sessionId);
        if (!state) {
            this.logger.info("invalid keepAlive requested for " + JSON.stringify(sessionId));
            return false;
        }
        state.keepAliveReceived();
        return true;
    }

    private getPlayerState(sessionId: string) {
        return this.players[sessionId];
    }

    private setPlayerState(input: PlayersData, state: PlayersState) {
        this.players[input.sessionId] = state;
    }
}
