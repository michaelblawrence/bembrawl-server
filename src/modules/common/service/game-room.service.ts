import { LoggerService } from "../provider";
import { GameStateService } from "./game-state.service";
import { RoomIdStateProvider } from "./room-id-state.provider";
import { GameState } from "../model/GameState";
import { PlayersState } from "../model/PlayersState";
import { Injectable } from "@nestjs/common";
import { Message } from "../model/Message";
import { GameMessagingService } from "./game-messaging.service";

@Injectable()
export class GameRoomService {
    public constructor(
        private readonly gameStateService: GameStateService,
        private readonly roomIdStateProvider: RoomIdStateProvider,
        private readonly gameMessagingService: GameMessagingService,
        private readonly logger: LoggerService
    ) {}

    public async newGame(seedPlayer?: PlayersState): Promise<GameState> {
        let joinId: number | null = null;
        try {
            joinId = this.roomIdStateProvider.claimRoomId();
            const game = new GameState(joinId);
            if (seedPlayer) {
                this.addPlayerToGame(seedPlayer, game);
            }
            this.gameStateService.setGame(game);
            return game;
        } catch {
            this.logger.error(
                "could not create new game" +
                    (seedPlayer
                        ? `for player with session id=${seedPlayer.sessionId}`
                        : "")
            );
            if (joinId !== null) {
                this.roomIdStateProvider.releaseRoomId(joinId);
            }
            throw new Error("Could not create game");
        }
    }

    public async joinGame(
        joinId: number,
        player: PlayersState
    ): Promise<GameState | null> {
        const game = await this.gameStateService.getGameRoom(joinId);
        if (!game) {
            return null;
        }
        this.logger.info(
            `player ${player.sessionId} joining active game id=${game.guid}`
        );
        this.addPlayerToGame(player, game);
        this.gameStateService.updateGame(game);

        const msg: Message = {
            type: "JOINED_PLAYER",
            payload: {
                eventTime: Date.now(),
                playerJoinOrder: player.getJoinOrder(),
            },
        };
        await this.gameMessagingService.dispatchAllExcept(game, msg, {
            playerId: player.deviceId,
        });
        return game;
    }

    public async leaveGame(player: PlayersState): Promise<boolean> {
        const gameGuid = player.getGameGuid();
        const game =
            gameGuid && (await this.gameStateService.getGame(gameGuid));
        if (!game) {
            return false;
        }
        const removePlayerSuccess = game.removePlayer(player);
        if (!removePlayerSuccess) {
            this.logger.error(
                `can not remove player id=${player.sessionId} as is not assigned to room id=${game.guid}`
            );
        }
        if (game.hasAnyPlayers()) {
            this.gameStateService.updateGame(game);
            this.logger.info(
                `removed player from game id=${game.guid} roomId=${game.joinId}.`
            );
        } else {
            this.gameStateService.removeGame(game);
            this.logger.info(
                `removed game id=${game.guid} roomId=${game.joinId}. All players left.`
            );
        }
        return true;
    }

    public async expireGame(gameGuid: string): Promise<boolean> {
        const game = await this.gameStateService.getGame(gameGuid);
        if (!game) {
            return false;
        }
        const players = Object.values(game.players);
        for (const player of players) {
            const removePlayerSuccess = game.removePlayer(player);
            if (!removePlayerSuccess) {
                this.logger.error(
                    `can not remove player id=${player.sessionId} as is not assigned to room id=${game.guid}`
                );
            }
            this.gameStateService.removePlayer(player.sessionId);
        }
        this.gameStateService.removeGame(game);
        this.gameMessagingService.expireGame(game);
        this.logger.info(
            `removed game id=${game.guid} roomId=${game.joinId}. Game was expired.`
        );
        return true;
    }

    public async closeRoom(
        roomId: number,
        player: PlayersState
    ): Promise<boolean> {
        const game = await this.gameStateService.getGameRoom(roomId);
        if (!game) {
            return false;
        }
        game.setClosed(true);
        const msg: Message = {
            type: "ROOM_READY",
            payload: {
                gameTimeStartTimeMs: Date.now(),
                gameCountDownMs: 10 * 1000,
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        return true;
    }

    private addPlayerToGame(player: PlayersState, game: GameState) {
        const existingPlayer = game.getPlayer(player.deviceId);
        if (existingPlayer) {
            this.logger.info(
                "player id already exists under other session killing id=" +
                    existingPlayer.sessionId
            );
            this.gameStateService.removePlayer(existingPlayer.sessionId);
        }
        player.assignGame(game.guid);

        const gameAddSuccess = game.addPlayers(player);
        if (!gameAddSuccess) {
            this.logger.info("could not add player on game id=" + game.guid);
            return;
        }

        const joinOrder = game.getPlayerJoinOrder(player.deviceId);
        if (joinOrder === null) {
            this.logger.info("could not add player on game id=" + game.guid);
            return;
        }
        player.assignJoinOrder(joinOrder);
    }
}
