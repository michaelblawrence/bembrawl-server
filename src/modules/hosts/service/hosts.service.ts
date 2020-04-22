import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../common/provider";

import { HostsData } from "../model/hosts.data";
import { GameStateService } from "../../common/service/game-state.service";
import { DateTimeProvider } from "../../common/service/date-time-provider";
import { GameRoomService } from "../../common/service/game-room.service";
import { HostState } from "../../common/model/HostState";
import { ICreatedHostGame } from "../../common/model/ICreatedHostGame";
import { KeepAliveProviderService } from "src/modules/common/service";
import { ClientMessage } from "src/modules/common/model/Message";
import { GameMessagingService } from "src/modules/common/service/game-messaging.service";

export const HostsServiceConfig = {
    HostTimeoutMs: 20 * 1000,
    PeriodicRateMs: 3 * 1000,
};

@Injectable()
export class HostsKeepAliveService extends KeepAliveProviderService<
    HostState
> {}

@Injectable()
export class HostsService {

    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameRoomService: GameRoomService,
        private readonly gameMessagingService: GameMessagingService,
        private readonly gameStateService: GameStateService,
        private readonly hostsKeepAliveService: HostsKeepAliveService,
        private readonly logger: LoggerService
    ) {
        hostsKeepAliveService.register({
            clientName: "players",
            hostTimeoutMs: HostsServiceConfig.HostTimeoutMs,
            periodicRateMs: HostsServiceConfig.PeriodicRateMs, 
            getClients: () => this.gameStateService.getAllHosts(),
            expireClient: host => this.expireGame(host)
        });
    }

    public async create(input: HostsData): Promise<ICreatedHostGame | null> {
        try {
            const state = new HostState(
                input.deviceId,
                input.sessionId,
                this.dateTimeProviderService
            );
            const game = await this.gameRoomService.newGame(state);
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

    public async keepAlive(sessionId: string): Promise<boolean> {
        const state = await this.gameStateService.getHost(sessionId);
        if (!state) {
            this.logger.info(
                "invalid host keepAlive requested for " +
                    JSON.stringify(sessionId)
            );
            return false;
        }
        this.hostsKeepAliveService.clientKeepAlive(state);
        return true;
    }

    public async popMessages(sessionId: string): Promise<ClientMessage[]> {
        const state = await this.gameStateService.getHost(sessionId);
        if (!state) {
            this.logger.info(
                "invalid host requested messages for " + JSON.stringify(sessionId)
            );
            return [];
        }
        const gameGuid = state.getGameGuid();
        if (!gameGuid) {
            return [];
        }
        const messages = this.gameMessagingService.popHostMessages(gameGuid, state.deviceId);
        this.hostsKeepAliveService.clientKeepAlive(state);
        return messages;
    }

    public shutdown() {
        this.hostsKeepAliveService.shutdown();
    }

    private async expireGame(host: HostState) {
        await this.gameStateService.removeHost(host.sessionId);
        await this.gameRoomService.expireGame(host.getGameGuid());
    }
}
