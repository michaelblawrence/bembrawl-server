import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../common/provider";

import { HostsData } from "../model/hosts.data";
import { IClientData } from "../../common/model/IPlayersData";
import { GameStateService } from "../../common/service/game-state.service";
import { DateTimeProvider } from "../../common/service/date-time-provider";
import { GameRoomService } from "../../common/service/game-room.service";
import { HostState } from "../../common/model/HostState";
import { ICreatedHostGame } from "../../common/model/ICreatedHostGame";

export const HostsServiceConfig = {
    PlayerTimeoutMs: 20 * 1000,
    PeriodicRateMs: 3 * 1000,
};

@Injectable()
export class HostsService {
    private readonly periodicHandle: any = null;

    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameRoomService: GameRoomService,
        private readonly gameStateService: GameStateService,
        private readonly logger: LoggerService
    ) {
        this.periodicHandle = setInterval(
            () => this.onTick(),
            HostsServiceConfig.PeriodicRateMs
        );
    }

    public async create(input: HostsData): Promise<ICreatedHostGame | null> {
        try {
            const state = new HostState(
                input.deviceId,
                input.sessionId,
                this.dateTimeProviderService
            );
            const game = await this.gameRoomService.newGame();
            state.assignGame(game.guid);
            this.gameStateService.setHost(state);
            return {
                joinId: game.joinId,
                gameGuid: game.guid,
            };
        } catch {
            this.logger.error("failed to create host game");
            return null;
        }
    }

    public async find(sessionId: string): Promise<IClientData> {
        const state = await this.gameStateService.getPlayer(sessionId);
        return { deviceId: state.deviceId, sessionId: state.sessionId };
    }

    public async keepAlive(sessionId: string): Promise<boolean> {
        const state = await this.gameStateService.getHost(sessionId);
        if (!state) {
            this.logger.info(
                "invalid host keepAlive requested for " +
                    JSON.stringify(sessionId)
            );
            return false;
        }
        state.keepAliveReceived();
        return true;
    }

    public shutdown() {
        if (this.periodicHandle) {
            clearInterval(this.periodicHandle);
        }
    }

    private async onTick() {
        const hosts = await this.gameStateService.getAllHosts();

        for (const host of hosts) {
            const msSincePrevKeepAlive = this.dateTimeProviderService.msSince(
                host.getLastKeepAliveMs()
            );
            if (msSincePrevKeepAlive > HostsServiceConfig.PlayerTimeoutMs) {
                try {
                    await this.gameStateService.removeHost(host.sessionId);
                    // TODO: add remove game + disconnect players
                    await this.gameRoomService.expireGame(host.getGameGuid());
                    this.logger.info(
                        `host timed out after ${msSincePrevKeepAlive} ms => sessionId=${host.sessionId}`
                    );
                } catch {
                    this.logger.error(
                        " failed to timeout host => sessionId=" + host.sessionId
                    );
                }
            }
        }
    }
}
