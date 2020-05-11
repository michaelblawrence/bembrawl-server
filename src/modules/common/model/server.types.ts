export type ClientMessage =
    | GameRoomMessages
    | EmojiGameMessages
    | GuessFirstGameMessages;

export enum MessageTypes {
    JOINED_PLAYER = "JOINED_PLAYER",
    PLAYER_LIST = "PLAYER_LIST",
    ROOM_READY = "ROOM_READY",
    CONNECT_SUCCESS = "CONNECT_SUCCESS",
    EMOJI_GAME_STARTED = "EMOJI_GAME_STARTED",
    EMOJI_NEW_PROMPT = "EMOJI_NEW_PROMPT",
    EMOJI_MATCH_PROMPT = "EMOJI_MATCH_PROMPT",
    EMOJI_ALL_RESPONSES = "EMOJI_ALL_RESPONSES",
    EMOJI_VOTING_RESULTS = "EMOJI_VOTING_RESULTS",
    GUESS_FIRST_GAME_STARTED = "GUESS_FIRST_GAME_STARTED",
    GUESS_FIRST_MATCH_PROMPT = "GUESS_FIRST_MATCH_PROMPT",
    GUESS_FIRST_ALL_RESPONSES = "GUESS_FIRST_ALL_RESPONSES",
    GUESS_FIRST_VOTING_RESULTS = "GUESS_FIRST_VOTING_RESULTS",
    GUESS_FIRST_WRONG_ANSWER = "GUESS_FIRST_WRONG_ANSWER"
}

export type GameRoomMessages =
    | JoinedPlayerMessage
    | PlayerListMessage
    | RoomReadyMessage
    | ConnectSuccessMessage;

export type EmojiGameMessages =
    | EmojiGameStartedMessage
    | EmojiNewPromptMessage
    | EmojiMatchPromptMessage
    | EmojiAllResponsesMessage
    | EmojiVotingResultsMessage;

export type GuessFirstGameMessages =
    | GuessFirstGameStartedMessage
    | GuessFirstMatchPromptMessage
    | GuessFirstAllResponsesMessage
    | GuessFirstVotingResultsMessage
    | GuessFirstWrongAnswerMessage;

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
        lastJoinedPlayer: PlayerListPlayer | null;
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
            playerJoinId: number;
            playerName: string | null;
        };
        promptPlayerAnswersEmoji: boolean;
    };
};

export type EmojiNewPromptMessage = {
    type: MessageTypes.EMOJI_NEW_PROMPT;
    payload: {
        promptText: string;
        promptSubject: string;
        promptFromPlayerId: string;
        timeoutMs: number;
    };
};

export type EmojiMatchPromptMessage = {
    type: MessageTypes.EMOJI_MATCH_PROMPT;
    payload: {
        promptText: string;
        promptSubject: string;
        promptFromPlayerId: string;
        promptEmoji: string;
        timeoutMs: number;
    };
};

export type EmojiAllResponsesMessage = {
    type: MessageTypes.EMOJI_ALL_RESPONSES;
    payload: {
        promptText: string;
        promptSubject: string;
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
    playerJoinId: number;
    responseEmoji: string[];
};

export type GuessFirstGameStartedMessage = {
    type: MessageTypes.GUESS_FIRST_GAME_STARTED;
    payload: {
        gameStartTimeMs: number;
        initialPromptPlayer: {
            playerId: string;
            playerJoinId: number;
            playerName: string | null;
        };
    };
};

export type GuessFirstMatchPromptMessage = {
    type: MessageTypes.GUESS_FIRST_MATCH_PROMPT;
    payload: {
        promptText: string;
        promptSubject: string;
        promptFromPlayerId: string;
        promptEmoji: string[];
        timeoutMs: number;
    };
};

export type GuessFirstAllResponsesMessage = {
    type: MessageTypes.GUESS_FIRST_ALL_RESPONSES;
    payload: {
        promptText: string;
        promptSubject: string;
        promptFromPlayerId: string;
        correctResponses: PlayerCorrectGuessResponse[];
    };
};

export type GuessFirstVotingResultsMessage = {
    type: MessageTypes.GUESS_FIRST_VOTING_RESULTS;
    payload: {
        promptText: string;
        promptFromPlayerId: string;
        votes: PlayerVotingResult[];
    };
};

export type GuessFirstWrongAnswerMessage = {
    type: MessageTypes.GUESS_FIRST_WRONG_ANSWER;
    payload: {
        promptSubject: string;
        playerName: string;
        incorrectGuess: string;
    };
};

export type PlayerCorrectGuessResponse = {
    playerId: string;
    playerJoinId: number;
    correctAnswer: string;
}
