import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../common/provider";

import { PlayersData } from "../model/players.data";
import { IClientData } from "../../common/model/IPlayersData";
import { GameStateService } from "../../common/service/game-state.service";
import { DateTimeProvider } from "../../common/service/date-time-provider";
import { PlayersState } from "../../common/model/PlayersState";
import { GameRoomService } from "../../common/service/game-room.service";
import { KeepAliveProviderService } from "src/modules/common/service";
import { GameState } from "src/modules/common/model/GameState";

const PlayersServiceConfig = {
    PlayerTimeoutMs: 20 * 1000,
    PeriodicRateMs: 3 * 1000,
};

@Injectable()
export class PlayerKeepAliveService extends KeepAliveProviderService<PlayersState> {}

@Injectable()
export class PlayersService {
    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameRoomService: GameRoomService,
        private readonly gameStateService: GameStateService,
        private readonly playerKeepAliveService: PlayerKeepAliveService,
        private readonly logger: LoggerService
    ) {
        playerKeepAliveService.register({
            clientName: "players",
            hostTimeoutMs: PlayersServiceConfig.PlayerTimeoutMs,
            periodicRateMs: PlayersServiceConfig.PeriodicRateMs,
            expireClient: (player) => this.expirePlayer(player),
            getClients: () => this.gameStateService.getAllPlayers(),
        });
    }

    public async create(input: PlayersData): Promise<IClientData> {
        const state = new PlayersState(
            input.deviceId,
            input.sessionId,
            this.dateTimeProviderService
        );
        this.gameStateService.setPlayer(state);
        const players = this.gameStateService.getAllPlayers();
        this.logger.info(JSON.stringify(players));
        return input;
    }

    public async keepAlive(sessionId: string): Promise<boolean> {
        const state = await this.gameStateService.getPlayer(sessionId);
        if (!state) {
            this.logger.info(
                "invalid keepAlive requested for " + JSON.stringify(sessionId)
            );
            return false;
        }
        this.playerKeepAliveService.clientKeepAlive(state);
        return true;
    }

    public async joinGame(sessionId: string, joinId: string): Promise<GameState | null> {
        const roomId = this.parseJoinId(joinId);
        if (roomId === null) {
            this.logger.info(
                `invalid room id for player id=${sessionId} joined game roomId=${roomId}`
            );
            return null;
        }

        const player = await this.gameStateService.getPlayer(sessionId);
        if (player === null) {
            this.logger.info(
                "no player found on join game requested by player=" + sessionId
            );
            return null;
        }

        const joinedGame = await this.gameRoomService.joinGame(roomId, player);
        if (!joinedGame) {
            this.logger.info("invalid join game requested for " + sessionId);
            return null;
        }

        this.logger.info(`player id=${sessionId} joined game roomId=${roomId}`);
        player.keepAliveReceived();
        return joinedGame;
    }

    public shutdown() {
        this.playerKeepAliveService.shutdown();
    }

    private async expirePlayer(player: PlayersState) {
        await this.gameStateService.removePlayer(player.sessionId);
        await this.gameRoomService.leaveGame(player);
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
