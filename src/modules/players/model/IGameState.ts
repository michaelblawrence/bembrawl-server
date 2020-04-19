import { PlayersState } from "./PlayersState";

export interface IGameState {
    guid: string;
    joinId: number;
    players: {
        [deviceId: string]: PlayersState;
    };
}
