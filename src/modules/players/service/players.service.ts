import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../common/provider";

import { PlayersData } from "../model/players.data";
import { IPlayersData } from "../../common/model/IPlayersData";
import { GameStateService } from "../../common/service/game-state.service";
import { DateTimeProvider } from "../../common/service/date-time-provider";
import { PlayersState } from "../../common/model/PlayersState";
import { GameRoomService } from "../../common/service/game-room.service";

const PlayersServiceConfig = {
    PlayerTimeoutMs: 20 * 1000,
    PeriodicRateMs: 3 * 1000,
};

@Injectable()
export class PlayersService {
    private readonly periodicHandle: any = null;

    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameRoomService: GameRoomService,
        private readonly gameStateService: GameStateService,
        private readonly logger: LoggerService
    ) {
        this.periodicHandle = setInterval(
            () => this.onTick(),
            PlayersServiceConfig.PeriodicRateMs
        );
    }

    public async create(input: PlayersData): Promise<IPlayersData> {
        const state = new PlayersState(
            input.deviceId,
            input.sessionId,
            this.dateTimeProviderService
        );
        this.gameStateService.setPlayer(input, state);
        const players = this.gameStateService.getAllPlayers();
        this.logger.info(JSON.stringify(players));
        return input;
    }

    public async find(sessionId: string): Promise<IPlayersData> {
        const state = await this.gameStateService.getPlayer(sessionId);
        return { deviceId: state.deviceId, sessionId: state.sessionId };
    }

    public async keepAlive(sessionId: string): Promise<boolean> {
        const state = await this.gameStateService.getPlayer(sessionId);
        if (!state) {
            this.logger.info(
                "invalid keepAlive requested for " + JSON.stringify(sessionId)
            );
            return false;
        }
        state.keepAliveReceived();
        return true;
    }

    public async joinGame(sessionId: string, joinId: string): Promise<boolean> {
        const roomId = this.parseJoinId(joinId);
        const player =
            roomId && (await this.gameStateService.getPlayer(sessionId));

        if (player && roomId && await this.gameRoomService.joinGame(roomId, player)) {
            this.logger.info(`player id=${sessionId} joined game roomId=${roomId}`);
            player.keepAliveReceived();
            return true;
        }

        this.logger.info("invalid join game requested for " + sessionId);
        return false;
    }

    public shutdown() {
        if (this.periodicHandle) {
            clearInterval(this.periodicHandle);
        }
    }

    private async onTick() {
        const players = await this.gameStateService.getAllPlayers();

        for (const player of players) {
            const msSincePrevKeepAlive = this.dateTimeProviderService.msSince(
                player.getLastKeepAliveMs()
            );
            if (msSincePrevKeepAlive > PlayersServiceConfig.PlayerTimeoutMs) {
                try {
                    await this.gameStateService.removePlayer(player.sessionId);
                    await this.gameRoomService.leaveGame(player);
                    this.logger.info(
                        `player timed out after ${msSincePrevKeepAlive} ms => sessionId=${player.sessionId}`
                    );
                } catch {
                    this.logger.error(
                        " failed to timeout player => sessionId=" +
                            player.sessionId
                    );
                }
            }
        }
    }

    private parseJoinId(joinId: string): number | null {
        try {
            return parseInt(joinId);
        } catch {
            this.logger.info(`invalid join id received '${joinId}'`);
            return null;
        }
    }
}
