import { Injectable } from "@nestjs/common";
import { GameState } from "../model/GameState";
import { PlayersState } from "../model/PlayersState";
import { RoomIdStateProvider } from "./room-id-state.provider";
import { HostState } from "../model/HostState";

interface PlayerStateStore {
    [sessionId: string]: PlayersState;
}

interface HostStateStore {
    [sessionId: string]: HostState;
}

interface GameStateStore {
    [gameGuid: string]: GameState;
}

@Injectable()
export class GameStateService {
    private readonly players: PlayerStateStore = {};
    private readonly hosts: HostStateStore = {};
    private readonly games: GameStateStore = {};

    constructor(private readonly roomIdStateProvider: RoomIdStateProvider) {}

    public async getAllPlayers(): Promise<PlayersState[]> {
        return Object.values(this.players);
    }

    public async getAllHosts(): Promise<HostState[]> {
        return Object.values(this.hosts);
    }

    public async getPlayer(sessionId: string): Promise<PlayersState | null> {
        const player = this.players[sessionId];
        if (player) {
            return player;
        }
        return null;
    }

    public async getHost(sessionId: string): Promise<HostState | null> {
        const host = this.hosts[sessionId];
        if (host) {
            return host;
        }
        return null;
    }

    public async removePlayer(sessionId: string): Promise<PlayersState> {
        const player = this.players[sessionId];
        delete this.players[sessionId];
        return player;
    }

    public async removeHost(sessionId: string): Promise<HostState> {
        const host = this.hosts[sessionId];
        delete this.hosts[sessionId];
        return host;
    }

    public async setPlayer(state: PlayersState): Promise<boolean> {
        if (this.players[state.sessionId]) {
            return false;
        }
        this.players[state.sessionId] = state;
        return true;
    }

    public async setHost(state: HostState): Promise<boolean> {
        if (this.players[state.sessionId]) {
            return false;
        }
        this.hosts[state.sessionId] = state;
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
