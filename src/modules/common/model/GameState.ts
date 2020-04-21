import { PlayersState } from "./PlayersState";
import { uuidv4 } from "../flow/uuidv4";
import { IGameState } from "./IGameState";

export class GameState implements IGameState {
    public readonly guid: string;
    public readonly players: {
        [deviceId: string]: PlayersState;
    } = {};
    private readonly playerIdxs: (string | null)[] = [];
    
    private isClosed: boolean = false;

    constructor(public readonly joinId: number) {
        this.guid = uuidv4();
    }

    public addPlayers(...players: PlayersState[]): boolean {
        if (!players) {
            return false;
        }
        players.forEach((element) => {
            this.players[element.deviceId] = element;

            if (!this.playerIdxs.includes(element.deviceId)) {
                this.playerIdxs.push(element.deviceId);
            }
        });
        return true;
    }

    public removePlayer(player: PlayersState): boolean {
        const gameGuid = player.getGameGuid();
        if (gameGuid !== this.guid || !this.getPlayer(player.deviceId)) {
            return false;
        }
        this.removePlayerItem(player.deviceId);
        return true;
    }

    public hasAnyPlayers(): boolean {
        return Object.keys(this.players).length > 0;
    }

    public getPlayerJoinOrder(deviceId: string): number | null {
        const player = this.players[deviceId];
        return typeof player === "undefined" ? null : this.playerIdxs.indexOf(player.deviceId);
    }

    public setClosed(isClosed: boolean): boolean {
        if (isClosed === this.isClosed) {
            return false;
        }
        this.isClosed = isClosed;
        return true;
    }

    public getPlayer(deviceId: string): PlayersState | null {
        const player = this.players[deviceId];
        return typeof player === "undefined" ? null : player;
    }

    private removePlayerItem(deviceId: string): boolean {
        const player = this.players[deviceId];
        if (typeof player === "undefined") {
            return false;
        }
        delete this.players[deviceId];
        return true;
    }
}
