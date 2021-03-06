import { LoggerService } from "../provider";
import { GameStateService } from "./game-state.service";
import { RoomIdStateProvider } from "./room-id-state.provider";
import { GameState } from "../model/GameState";
import { PlayersState } from "../model/PlayersState";
import { Injectable } from "@nestjs/common";
import { ClientMessage, MessageTypes } from "../model/server.types";
import { GameMessagingService } from "./game-messaging.service";
import { HostState } from "../model/HostState";

@Injectable()
export class GameRoomService {
    public constructor(
        private readonly gameStateService: GameStateService,
        private readonly roomIdStateProvider: RoomIdStateProvider,
        private readonly gameMessagingService: GameMessagingService,
        private readonly logger: LoggerService
    ) {}

    public async newGame(
        host: HostState,
        seedPlayer?: PlayersState
    ): Promise<GameState> {
        let joinId: number | null = null;
        try {
            joinId = this.roomIdStateProvider.claimRoomId();
            const game = new GameState(joinId);
            game.addHost(host);
            if (seedPlayer) {
                this.addPlayerToGame(seedPlayer, game);
            }
            this.gameStateService.setGame(game);
            return game;
        } catch {
            if (seedPlayer) {
                this.logger.error(
                    "could not create new game with player",
                    seedPlayer
                );
            } else {
                this.logger.error("could not create new game");
            }
            if (joinId !== null) {
                this.roomIdStateProvider.releaseRoomId(joinId);
            }
            throw new Error("Could not create game");
        }
    }

    public async hostJoinRoom(
        joinId: number,
        host: HostState
    ): Promise<GameState | null> {
        const game = await this.gameStateService.getGameRoom(joinId);
        if (!game) {
            this.logger.info(
                `additional host id = ${host.deviceId} requested room was not found with id=${joinId}`
            );
            return null;
        }
        if (game.closed()) {
            this.logger.info(
                `additional host id = ${host.deviceId} requested room was closed/locked with id=${joinId}`,
                null,
                game
            );
            return null;
        }

        const addSuccess = game.addHost(host);
        if (!addSuccess) return null;

        this.gameStateService.updateGame(game);
        this.logger.info(
            `additional host id = ${host.deviceId} joined active game room`,
            null,
            game
        );

        await this.sendHostPlayersNotification(game);
        return game;
    }

    public async joinGame(
        joinId: number,
        player: PlayersState
    ): Promise<GameState | null> {
        const game = await this.gameStateService.getGameRoom(joinId);
        if (!game) {
            this.logger.info(
                `player requested room was not found with id=${joinId}`,
                player
            );
            return null;
        }
        const addSuccess = this.addPlayerToGame(player, game);
        if (!addSuccess) return null;

        this.gameStateService.updateGame(game);
        this.logger.info(`player joined active game`, player, game);

        await this.sendJoinedPlayerNotification(player, game);
        return game;
    }

    public async sendJoinedPlayerNotification(
        player: PlayersState,
        game: GameState,
        playerNameChanged: boolean = false
    ) {
        const lastJoinedPlayer = {
            playerId: player.getJoinOrder(),
            playerName: game.getPlayerName(player.deviceId), // TODO: use formatted player name
        };
        const msg: ClientMessage = {
            type: MessageTypes.JOINED_PLAYER,
            payload: {
                eventTime: Date.now(),
                playerJoinOrder: lastJoinedPlayer.playerId,
                playerJoinName: lastJoinedPlayer.playerName,
                playerCount: Object.keys(game.players).length,
                playerNameChanged,
            },
        };
        await this.gameMessagingService.dispatchAllPlayersExcept(game, msg, {
            playerId: player.deviceId,
        });
        const playersCountMsg: ClientMessage = {
            type: MessageTypes.JOINED_PLAYER,
            payload: {
                eventTime: Date.now(),
                playerJoinOrder: null,
                playerJoinName: null,
                playerCount: Object.keys(game.players).length,
                playerNameChanged,
            },
        };
        await this.gameMessagingService.dispatchPlayer(game, playersCountMsg, {
            playerId: player.deviceId,
        });
        await this.sendHostPlayersNotification(game, lastJoinedPlayer);
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
                `can not remove player as is not assigned to room`,
                player,
                game
            );
        }
        if (game.hasAnyPlayers()) {
            this.gameStateService.updateGame(game);
            this.logger.info(`removed player from game room`, player, game);
        } else {
            const success = this.gameStateService.removeGame(game);
            if (success) {
                this.logger.info(
                    `deleted game after all players left room`,
                    player,
                    game
                );
            } else {
                this.logger.error(
                    `could not delete game after all players left room`,
                    player,
                    game
                );
            }
        }
        return true;
    }

    public async expireGame(gameGuid: string): Promise<boolean> {
        const game = await this.gameStateService.getGame(gameGuid);
        this.logger.info(`attempting to expire game room`, null, game);
        if (!game) {
            this.logger.error(`can not expire game guid=${gameGuid}`);
            return false;
        }
        const players = Object.values(game.players);
        for (const player of players) {
            const removePlayerSuccess = game.removePlayer(player);
            if (!removePlayerSuccess) {
                this.logger.error(
                    `can not remove player as is not assigned to room`,
                    player,
                    game
                );
            }
            this.gameStateService.removePlayer(player.sessionId);
        }
        const success = this.gameStateService.removeGame(game);
        if (!success) {
            this.logger.error(
                `can not remove game on expire`,
                null,
                game
            );
        }
        this.gameMessagingService.expireGame(game);
        this.logger.info(`expired game room`, null, game);
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
        const msg: ClientMessage = {
            type: MessageTypes.ROOM_READY,
            payload: {
                gameTimeStartTimeMs: Date.now(),
                gameCountDownMs: 10 * 1000,
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
        return true;
    }

    private addPlayerToGame(player: PlayersState, game: GameState): boolean {
        const existingPlayer = game.getPlayer(player.deviceId);
        if (existingPlayer) {
            this.logger.info(
                "player id already exists under other session killing id=" +
                    existingPlayer.sessionId,
                player,
                game
            );
            this.gameStateService.removePlayer(existingPlayer.sessionId);
        } else if (game.closed()) {
            this.logger.info(
                `player failed to join. game room is closed`,
                player,
                game
            );
            return false;
        }

        player.assignGame(game.guid);

        const gameAddSuccess = game.addPlayers(player);
        if (!gameAddSuccess) {
            this.logger.info("could not add player to game", player, game);
            return false;
        }

        const joinOrder = game.getPlayerJoinOrder(player.deviceId);
        if (joinOrder === null) {
            this.logger.info(
                "could not get player join id in game room",
                player,
                game
            );
            return false;
        }
        player.assignJoinOrder(joinOrder);
        return true;
    }

    private async sendHostPlayersNotification(
        game: GameState,
        lastJoinedPlayer: {
            playerId: number | null;
            playerName: string | null;
        } | null = null
    ) {
        const playersMsg: ClientMessage = {
            type: MessageTypes.PLAYER_LIST,
            payload: {
                lastJoinedPlayer: lastJoinedPlayer,
                players: Object.values(game.players).map((player) => ({
                    playerId: player.getJoinOrder(),
                    playerName: game.getPlayerName(player.deviceId), // TODO: use formatted player name
                })),
            },
        };
        await this.gameMessagingService.dispatchHost(game, playersMsg);
    }
}
