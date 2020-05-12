import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../common/provider";

import { IJoinGameData } from "../model/hosts.data";
import { GameStateService } from "../../common/service/game-state.service";
import { DateTimeProvider } from "../../common/service/date-time-provider";
import { GameRoomService } from "../../common/service/game-room.service";
import { HostState } from "../../common/model/HostState";
import { ICreatedHostGame } from "../../common/model/ICreatedHostGame";
import { KeepAliveProviderService } from "src/modules/common/service";
import { ClientMessage } from "src/modules/common/model/server.types";
import { GameMessagingService } from "src/modules/common/service/game-messaging.service";
import { IClientData } from "src/modules/common/model/IPlayersData";

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
            clientName: "host",
            hostTimeoutMs: HostsServiceConfig.HostTimeoutMs,
            periodicRateMs: HostsServiceConfig.PeriodicRateMs,
            getClients: () => this.gameStateService.getAllHosts(),
            expireClient: (host) => this.expireGame(host),
        });
    }

    public async create(input: IClientData): Promise<ICreatedHostGame | null> {
        try {
            const state = new HostState(
                input.deviceId,
                input.sessionId,
                this.dateTimeProviderService
            );
            this.gameStateService.setHost(state);
            const game = await this.gameRoomService.newGame(state);
            state.assignGame(game.guid);
            this.logger.info(
                `Created new host with ID ${state.deviceId}:${state.sessionId} in room id = ${game.joinId}`
            );
            return {
                deviceId: state.deviceId,
                sessionId: state.sessionId,
                joinId: game.joinId
            };
        } catch {
            this.logger.error("failed to create host game");
            return null;
        }
    }

    public async joinRoom(
        input: IJoinGameData
    ): Promise<ICreatedHostGame | null> {
        try {
            const state = new HostState(
                input.deviceId,
                input.sessionId,
                this.dateTimeProviderService
            );
            const joinedGame = await this.gameRoomService.hostJoinRoom(
                input.joinId,
                state
            );
            if (!joinedGame) {
                this.logger.info(
                    "invalid join game requested for " + input.sessionId
                );
                return null;
            }
            state.assignGame(joinedGame.guid);
            this.gameStateService.setHost(state);
            return {
                deviceId: state.deviceId,
                sessionId: state.sessionId,
                joinId: joinedGame.joinId
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
        // this.logger.info("good keep alive at " + sessionId);
        this.hostsKeepAliveService.clientKeepAlive(state);
        return true;
    }

    public async popMessages(sessionId: string): Promise<ClientMessage[]> {
        const state = await this.gameStateService.getHost(sessionId);
        if (!state) {
            this.logger.info(
                "invalid host requested messages for " +
                    JSON.stringify(sessionId)
            );
            return [];
        }
        const gameGuid = state.getGameGuid();
        if (!gameGuid) {
            return [];
        }
        const messages = this.gameMessagingService.popHostMessages(
            gameGuid,
            state.deviceId
        );
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
