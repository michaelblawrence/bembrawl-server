export enum MessageTypes {
    JOINED_PLAYER = "JOINED_PLAYER",
    PLAYER_LIST = "PLAYER_LIST",
    ROOM_READY = "ROOM_READY",
    CONNECT_SUCCESS = "CONNECT_SUCCESS",
}

export type ClientMessage =
    | JoinedPlayerMessage
    | PlayerListMessage
    | RoomReadyMessage
    | ConnectSuccessMessage;

export type JoinedPlayerMessage = {
    type: MessageTypes.JOINED_PLAYER;
    payload: {
        eventTime: number;
        playerJoinOrder: number | null;
        playerCount: number;
    };
};

export type ConnectSuccessMessage = {
    type: MessageTypes.CONNECT_SUCCESS;
    payload: { joinId?: number };
};

export type PlayerListMessage = {
    type: MessageTypes.PLAYER_LIST;
    payload: {
        lastJoinedPlayer: PlayerListPlayer;
        players: PlayerListPlayer[];
    };
};

type PlayerListPlayer = {
    playerId: number | null;
};

export type RoomReadyMessage = {
    type: MessageTypes.ROOM_READY;
    payload: {
        gameTimeStartTimeMs: number;
        gameCountDownMs: number;
    };
};
