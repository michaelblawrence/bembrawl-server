import { GameState } from "../model/GameState";
import { Injectable } from "@nestjs/common";
import { Message } from "../model/Message";

type PlayerId = string;
type GamePlayerQueue = Map<PlayerId, Message[]>;

type HostId = string;
type GameHostQueue = Map<HostId, Message[]>;

type GameQueue = {
    players: GamePlayerQueue;
    hosts: GameHostQueue;
};

type GameId = string;
type GlobalState = Map<GameId, GameQueue>;

@Injectable()
export class GameMessagingService {
    private readonly state: GlobalState = new Map<GameId, GameQueue>();

    public async dispatchAll(game: GameState, msg: Message) {
        const playerIds = Object.keys(game.players);
        for (const playerId of playerIds) {
            this.pushPlayerMessage(game.guid, playerId, msg);
        }
    }

    public async dispatchAllExcept(
        game: GameState,
        msg: Message,
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

    public async popPlayerMessages(
        gameGuid: string,
        playerId: string
    ): Promise<Message[]> {
        const playerQueue = this.getPlayersQueue(gameGuid);
        const queue = playerQueue.get(playerId);

        if (queue && queue.length) {
            playerQueue.set(playerId, []);
        }
        
        return queue || [];
    }

    public async expireGame(game: GameState): Promise<void> {
        this.removePlayersQueue(game.guid);
    }

    private pushPlayerMessage(
        gameGuid: string,
        playerId: string,
        message: Message
    ) {
        const playerQueue = this.getOrCreatePlayersQueue(gameGuid);
        const queue = this.getOrCreateQueue(playerQueue, playerId);
        queue.push(message);
    }

    private getOrCreateQueue(
        playerQueue: GamePlayerQueue,
        playerId: string
    ): Message[] {
        const queue = playerQueue.get(playerId) || [];
        if (!playerQueue.get(playerId)) {
            playerQueue.set(playerId, queue);
        }
        return queue;
    }

    private getOrCreatePlayersQueue(gameGuid: string): GamePlayerQueue {
        const playerQueue =
            this.state.get(gameGuid) || this.createEmptyGameQueue();

        if (!this.state.get(gameGuid)) {
            this.state.set(gameGuid, playerQueue);
        }
        return playerQueue.players;
    }

    private getPlayersQueue(gameGuid: string): GamePlayerQueue {
        const gameState =
            this.state.get(gameGuid) || this.createEmptyGameQueue();
        return gameState.players;
    }

    private removePlayersQueue(gameGuid: string): GamePlayerQueue | null {
        const playersQueue = this.state.get(gameGuid);
        if (typeof playersQueue === "undefined") {
            return null;
        }

        this.state.delete(gameGuid);
        return playersQueue.players;
    }

    private createEmptyGameQueue(): GameQueue {
        return {
            hosts: new Map<HostId, Message[]>(),
            players: new Map<PlayerId, Message[]>(),
        };
    }
}
