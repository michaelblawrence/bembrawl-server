import { GameState } from "../model/GameState";
import { Injectable } from "@nestjs/common";
import { ClientMessage } from "../model/server.types";

type PlayerId = string;
type GamePlayersQueue = Map<PlayerId, ClientMessage[]>;

type HostId = string;
type GameHostsQueue = Map<HostId, ClientMessage[]>;

type GameQueue = {
    players: GamePlayersQueue;
    hosts: GameHostsQueue;
};

type GameId = string;
type GlobalState = Map<GameId, GameQueue>;

@Injectable()
export class GameMessagingService {
    private readonly state: GlobalState = new Map<GameId, GameQueue>();

    public async dispatchAll(game: GameState, msg: ClientMessage) {
        const playerIds = Object.keys(game.players);
        for (const playerId of playerIds) {
            this.pushPlayerMessage(game.guid, playerId, msg);
        }
    }

    public async dispatchAllPlayersExcept(
        game: GameState,
        msg: ClientMessage,
        ...excludedPlayers: { playerId: string }[]
    ) {
        if (!excludedPlayers || excludedPlayers.length === 0) {
            this.dispatchAll(game, msg);
            return;
        }

        const excludedPlayersSet = new Set(
            excludedPlayers.map((player) => player.playerId)
        );

        const playerIds = Object.keys(game.players);
        for (const playerId of playerIds) {
            if (!excludedPlayersSet.has(playerId)) {
                this.pushPlayerMessage(game.guid, playerId, msg);
            }
        }
    }

    public async dispatchHost(game: GameState, msg: ClientMessage) {
        for (const hosts in game.hosts) {
            this.pushHostMessage(game.guid, hosts, msg);
        }
    }

    public async popPlayerMessages(
        gameGuid: string,
        playerId: string
    ): Promise<ClientMessage[]> {
        const playerQueue = this.getPlayersQueue(gameGuid);
        const queue = playerQueue.get(playerId);

        if (queue && queue.length) {
            playerQueue.set(playerId, []);
        }

        return queue || [];
    }

    public async popHostMessages(
        gameGuid: string,
        hostId: string
    ): Promise<ClientMessage[]> {
        const hostQueue = this.getHostsQueue(gameGuid);
        const queue = hostQueue.get(hostId);

        if (queue && queue.length) {
            hostQueue.set(hostId, []);
        }

        return queue || [];
    }

    public async expireGame(game: GameState): Promise<void> {
        this.removePlayersQueue(game.guid);
        this.removeHostsQueue(game.guid);
    }

    private pushHostMessage(
        gameGuid: string,
        hostId: string,
        message: ClientMessage
    ) {
        const hostsQueue = this.getOrCreateHostsQueue(gameGuid);
        const queue = this.getOrCreateHostQueue(hostsQueue, hostId);
        queue.push(message);
    }

    private getOrCreateHostQueue(
        hostsQueue: GameHostsQueue,
        hostId: string
    ): ClientMessage[] {
        const queue = hostsQueue.get(hostId) || [];
        if (!hostsQueue.get(hostId)) {
            hostsQueue.set(hostId, queue);
        }
        return queue;
    }

    private getOrCreateHostsQueue(gameGuid: string): GameHostsQueue {
        const hostsQueue =
            this.state.get(gameGuid) || this.createEmptyGameQueue();

        if (!this.state.get(gameGuid)) {
            this.state.set(gameGuid, hostsQueue);
        }
        return hostsQueue.hosts;
    }

    private getHostsQueue(gameGuid: string): GameHostsQueue {
        const gameState =
            this.state.get(gameGuid) || this.createEmptyGameQueue();
        return gameState.hosts;
    }

    private removeHostsQueue(gameGuid: string): GameHostsQueue | null {
        const hostsQueue = this.state.get(gameGuid);
        if (typeof hostsQueue === "undefined") {
            return null;
        }

        this.state.delete(gameGuid);
        return hostsQueue.hosts;
    }

    private pushPlayerMessage(
        gameGuid: string,
        playerId: string,
        message: ClientMessage
    ) {
        const playerQueue = this.getOrCreatePlayersQueue(gameGuid);
        const queue = this.getOrCreatePlayerQueue(playerQueue, playerId);
        queue.push(message);
    }

    private getOrCreatePlayerQueue(
        playerQueue: GamePlayersQueue,
        playerId: string
    ): ClientMessage[] {
        const queue = playerQueue.get(playerId) || [];
        if (!playerQueue.get(playerId)) {
            playerQueue.set(playerId, queue);
        }
        return queue;
    }

    private getOrCreatePlayersQueue(gameGuid: string): GamePlayersQueue {
        const playerQueue =
            this.state.get(gameGuid) || this.createEmptyGameQueue();

        if (!this.state.get(gameGuid)) {
            this.state.set(gameGuid, playerQueue);
        }
        return playerQueue.players;
    }

    private getPlayersQueue(gameGuid: string): GamePlayersQueue {
        const gameState =
            this.state.get(gameGuid) || this.createEmptyGameQueue();
        return gameState.players;
    }

    private removePlayersQueue(gameGuid: string): GamePlayersQueue | null {
        const playersQueue = this.state.get(gameGuid);
        if (typeof playersQueue === "undefined") {
            return null;
        }

        this.state.delete(gameGuid);
        return playersQueue.players;
    }

    private createEmptyGameQueue(): GameQueue {
        return {
            hosts: new Map<HostId, ClientMessage[]>(),
            players: new Map<PlayerId, ClientMessage[]>(),
        };
    }
}
