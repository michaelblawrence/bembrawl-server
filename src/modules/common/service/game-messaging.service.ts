import { GameState } from "../model/GameState";
import { Injectable } from "@nestjs/common";
import { Message } from "../model/Message";

type PlayersQueue = {
    [playerId: string]: Message[];
};

@Injectable()
export class GameMessagingService {
    private readonly state: {
        [gameGuid: string]: PlayersQueue;
    } = {};

    public async dispatchAll(game: GameState, msg: Message) {
        const playerIds = Object.keys(game.players);
        for (const playerId of playerIds) {
            this.pushMessage(game.guid, playerId, msg);
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
                this.pushMessage(game.guid, playerId, msg);
            }
        }
    }

    public async popPlayerMessages(
        gameGuid: string,
        playerId: string
    ): Promise<Message[]> {
        const playerQueue = this.getPlayersQueue(gameGuid);
        const queue = playerQueue[playerId];

        if (playerQueue[playerId] && playerQueue[playerId].length) {
            playerQueue[playerId] = [];
        }
        return queue || [];
    }

    public async expireGame(game: GameState): Promise<void> {
        this.removePlayersQueue(game.guid);
    }

    private pushMessage(gameGuid: string, playerId: string, message: Message) {
        const playerQueue = this.getOrCreatePlayersQueue(gameGuid);
        const queue = this.getOrCreateQueue(playerQueue, playerId);
        queue.push(message);
    }

    private getOrCreateQueue(playerQueue: PlayersQueue, playerId: string) {
        const queue = playerQueue[playerId] || [];
        if (!playerQueue[playerId]) {
            playerQueue[playerId] = queue;
        }
        return queue;
    }

    private getOrCreatePlayersQueue(gameGuid: string): PlayersQueue {
        const playerQueue = this.state[gameGuid] || [];
        if (!this.state[gameGuid]) {
            this.state[gameGuid] = playerQueue;
        }
        return playerQueue;
    }

    private getPlayersQueue(gameGuid: string): PlayersQueue {
        return this.state[gameGuid] || [];
    }

    private removePlayersQueue(gameGuid: string): PlayersQueue | null {
        const playersQueue = this.state[gameGuid];
        if (typeof playersQueue === "undefined") {
            return null;
        }

        delete this.state[gameGuid];
        return playersQueue;
    }
}
