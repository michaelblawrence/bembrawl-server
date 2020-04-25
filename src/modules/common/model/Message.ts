export enum MessageTypes {
    JOINED_PLAYER = "JOINED_PLAYER",
    PLAYER_LIST = "PLAYER_LIST",
    ROOM_READY = "ROOM_READY",
    CONNECT_SUCCESS = "CONNECT_SUCCESS",
    EMOJI_GAME_STARTED = "EMOJI_GAME_STARTED",
    EMOJI_NEW_PROMPT = "EMOJI_NEW_PROMPT",
    EMOJI_ALL_RESPONSES = "EMOJI_ALL_RESPONSES",
    EMOJI_VOTING_RESULTS = "EMOJI_VOTING_RESULTS",
}

export type ClientMessage =
    | JoinedPlayerMessage
    | PlayerListMessage
    | RoomReadyMessage
    | ConnectSuccessMessage
    | EmojiGameStartedMessage
    | EmojiNewPromptMessage
    | EmojiAllResponsesMessage
    | EmojiVotingResultsMessage;

export type JoinedPlayerMessage = {
    type: MessageTypes.JOINED_PLAYER;
    payload: {
        eventTime: number;
        playerJoinOrder: number | null;
        playerJoinName: string | null;
        playerCount: number;
        playerNameChanged: boolean;
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
    playerName: string | null;
};

export type RoomReadyMessage = {
    type: MessageTypes.ROOM_READY;
    payload: {
        gameTimeStartTimeMs: number;
        gameCountDownMs: number;
    };
};

export type EmojiGameStartedMessage = {
    type: MessageTypes.EMOJI_GAME_STARTED;
    payload: {
        gameStartTimeMs: number;
        initialPromptPlayer: {
            playerId: string;
            playerName: string | null;
        };
    };
};

export type EmojiNewPromptMessage = {
    type: MessageTypes.EMOJI_NEW_PROMPT;
    payload: {
        promptText: string;
        promptFromPlayerId: string;
        timeoutMs: number;
    };
};

export type EmojiAllResponsesMessage = {
    type: MessageTypes.EMOJI_ALL_RESPONSES;
    payload: {
        promptText: string;
        promptFromPlayerId: string;
        emojiResponses: PlayerEmojiResponse[];
    };
};

export type EmojiVotingResultsMessage = {
    type: MessageTypes.EMOJI_VOTING_RESULTS;
    payload: {
        promptText: string;
        promptFromPlayerId: string;
        votes: PlayerVotingResult[];
    };
};

export type PlayerVotingResult = {
    playerName: string;
    playerId: string;
    voteCount: number;
};

export type PlayerEmojiResponse = {
    playerId: string;
    responseEmoji: string[];
};
