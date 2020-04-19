import { Injectable } from "@nestjs/common";
import { GameState } from "../model/GameState";
import { PlayersState } from "../model/PlayersState";
import { RoomIdStateProvider } from "./room-id-state.provider";
import { IPlayersData } from "../model/IPlayersData";

interface PlayerStateStore {
    [sessionId: string]: PlayersState;
}

interface GameStateStore {
    [gameGuid: string]: GameState;
}

@Injectable()
export class GameStateService {
    private readonly players: PlayerStateStore = {};
    private readonly games: GameStateStore = {};

    constructor(private readonly roomIdStateProvider: RoomIdStateProvider) {}

    public async getAllPlayers(): Promise<PlayersState[]> {
        return Object.values(this.players);
    }

    public async getPlayer(sessionId: string): Promise<PlayersState> {
        return this.players[sessionId];
    }

    public async removePlayer(sessionId: string): Promise<PlayersState> {
        const player = this.players[sessionId];
        delete this.players[sessionId];
        return player;
    }

    public async setPlayer(
        input: IPlayersData,
        state: PlayersState
    ): Promise<boolean> {
        if (this.players[input.sessionId]) {
            return false;
        }
        this.players[input.sessionId] = state;
        return true;
    }

    public async setGame(game: GameState): Promise<boolean> {
        if (this.games[game.guid]) {
            return false;
        }
        this.games[game.guid] = game;
        this.roomIdStateProvider.assignGameToRoom(game.joinId, game.guid);
        return true;
    }

    public async updateGame(game: GameState): Promise<boolean> {
        if (this.games[game.guid]) {
            this.games[game.guid] = game;
            return true;
        }
        return false;
    }

    public async removeGame(game: GameState): Promise<boolean> {
        if (this.games[game.guid]) {
            return false;
        }
        delete this.games[game.guid];
        this.roomIdStateProvider.releaseRoomId(game.joinId);
        return true;
    }

    public async getGameRoom(roomId: number): Promise<GameState | null> {
        const gameGuid = this.roomIdStateProvider.lookupGameRoomGuid(roomId);
        const game = gameGuid && this.games[gameGuid];
        if (game) {
            return game;
        }
        return null;
    }

    public async getGame(gameGuid: string): Promise<GameState | null> {
        const game = gameGuid && this.games[gameGuid];
        if (game) {
            return game;
        }
        return null;
    }
}
