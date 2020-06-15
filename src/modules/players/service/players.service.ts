import { Injectable } from "@nestjs/common";

import { LoggerService } from "../../common/provider";
import { GameStateService } from "../../common/service/game-state.service";
import { DateTimeProvider } from "../../common/service/date-time-provider";
import { PlayersState } from "../../common/model/PlayersState";
import { GameRoomService } from "../../common/service/game-room.service";
import { KeepAliveProviderService } from "src/modules/common/service";
import { GameState } from "src/modules/common/model/GameState";
import { GameMessagingService } from "src/modules/common/service/game-messaging.service";
import { ClientMessage } from "src/modules/common/model/server.types";
import { AuthTokenService } from "src/modules/common/service/auth-token.service";
import { IClientData } from "src/modules/common/model/IPlayersData";

const PlayersServiceConfig = {
    PlayerTimeoutMs: 20 * 1000,
    PeriodicRateMs: 3 * 1000,
};

@Injectable()
export class PlayerKeepAliveService extends KeepAliveProviderService<
    PlayersState
> {}

@Injectable()
export class PlayersService {
    public constructor(
        private readonly authTokenService: AuthTokenService,
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameRoomService: GameRoomService,
        private readonly gameStateService: GameStateService,
        private readonly gameMessagingService: GameMessagingService,
        private readonly playerKeepAliveService: PlayerKeepAliveService,
        private readonly logger: LoggerService
    ) {
        playerKeepAliveService.register({
            clientName: "player",
            hostTimeoutMs: PlayersServiceConfig.PlayerTimeoutMs,
            periodicRateMs: PlayersServiceConfig.PeriodicRateMs,
            expireClient: (player) => this.expirePlayer(player),
            getClients: () => this.gameStateService.getAllPlayers(),
        });
    }

    public async create(client: IClientData): Promise<PlayersState> {
        const state = new PlayersState(
            client.deviceId,
            client.sessionId,
            this.dateTimeProviderService
        );
        const newIdAdded = await this.gameStateService.setPlayer(state);
        if (!newIdAdded) {
            this.logger.info("identical session id joined for player", state);
        }
        return state;
    }

    public async popMessages(sessionId: string): Promise<ClientMessage[]> {
        const state = await this.gameStateService.getPlayer(sessionId);
        if (!state) {
            this.logger.info(
                "invalid player requested messages for " +
                    JSON.stringify(sessionId)
            );
            return [];
        }
        const gameGuid = state.getGameGuid();
        if (!gameGuid) {
            return [];
        }
        const messages = this.gameMessagingService.popPlayerMessages(
            gameGuid,
            state.deviceId
        );
        this.playerKeepAliveService.clientKeepAlive(state);
        return messages;
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

    public async joinGame(
        sessionId: string,
        joinId: string
    ): Promise<{ game: GameState; player: PlayersState } | null> {
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
        return { game: joinedGame, player };
    }

    public async changePlayerName(
        sessionId: string,
        playerName: string
    ): Promise<boolean> {
        const player = await this.gameStateService.getPlayer(sessionId);
        if (player === null) {
            this.logger.info(
                "no player found on close room requested by player=" + sessionId
            );
            return false;
        }

        const gameGuid = player.getGameGuid();
        const game =
            gameGuid && (await this.gameStateService.getGame(gameGuid));
        if (!game) {
            this.logger.info(
                "invalid get joined game for player name for " + sessionId
            );
            return false;
        }

        const prevName = game.getPlayerName(player.deviceId);
        const success = game.setPlayerName(player.deviceId, playerName);
        const status = success ? "successfully" : "unsuccessfully";

        this.logger.info(
            `player id=${sessionId} ${status} changed name from "${
                prevName || ""
            }" to "${playerName}"`
        );
        player.keepAliveReceived();
        this.gameRoomService.sendJoinedPlayerNotification(player, game, true);
        return success;
    }

    public async closeRoom(
        sessionId: string,
        joinId: string
    ): Promise<boolean> {
        const roomId = this.parseJoinId(joinId);
        if (roomId === null) {
            this.logger.info(
                `invalid room id for player id=${sessionId} closed game roomId=${roomId}`
            );
            return false;
        }

        const player = await this.gameStateService.getPlayer(sessionId);
        if (player === null) {
            this.logger.info(
                "no player found on close room requested by player=" + sessionId
            );
            return false;
        }
        if (!player.isMaster()) {
            this.logger.info(
                "player found on close room was not master, requested by player=" +
                    sessionId
            );
            return false;
        }

        const closeRoom = await this.gameRoomService.closeRoom(roomId, player);
        if (!closeRoom) {
            this.logger.info("invalid close room requested for " + sessionId);
            return false;
        }

        this.logger.info(`player id=${sessionId} closed room roomId=${roomId}`);
        player.keepAliveReceived();
        return true;
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
