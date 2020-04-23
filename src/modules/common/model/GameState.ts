import { PlayersState } from "./PlayersState";
import { uuidv4 } from "../flow/uuidv4";
import { IGameState } from "./IGameState";
import { HostState } from "./HostState";

export class GameState implements IGameState {
    public readonly guid: string;
    public readonly players: {
        [deviceId: string]: PlayersState;
    } = {};
    public readonly hosts: {
        [deviceId: string]: HostState;
    } = {};
    private readonly playerOrderInfo: ({
        deviceId: string;
        playerName: string | null;
    })[] = [];

    private isClosed: boolean = false;

    constructor(public readonly joinId: number) {
        this.guid = uuidv4();
    }

    public addHost(host: HostState): boolean {
        this.hosts[host.deviceId] = host;
        return true;
    }

    public addPlayers(...players: PlayersState[]): boolean {
        if (!players) {
            return false;
        }
        players.forEach((element) => {
            this.players[element.deviceId] = element;

            if (
                !this.playerOrderInfo.find(
                    (info) => info.deviceId === element.deviceId
                )
            ) {
                this.playerOrderInfo.push({
                    deviceId: element.deviceId,
                    playerName: null,
                });
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
        return typeof player === "undefined"
            ? null
            : this.playerOrderInfo.findIndex(info => info.deviceId === player.deviceId);
    }

    public getPlayerName(deviceId: string): string | null {
        const player = this.players[deviceId];
        return typeof player === "undefined"
            ? null
            : this.getPlayerInfo(player.deviceId)?.playerName || null;
    }

    public setPlayerName(deviceId: string, playerName: string): boolean {
        const info = this.getPlayerInfo(deviceId);
        if (info) {
            info.playerName = playerName;
            return true;
        }
        return false;
    }

    public setClosed(isClosed: boolean): boolean {
        if (isClosed === this.isClosed) {
            return false;
        }
        this.isClosed = isClosed;
        return true;
    }

    public closed(): boolean {
        return this.isClosed;
    }

    public getPlayer(deviceId: string): PlayersState | null {
        const player = this.players[deviceId];
        return typeof player === "undefined" ? null : player;
    }

    private getPlayerInfo(deviceId: string) {
        return this.playerOrderInfo.find(info => info.deviceId === deviceId);
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
