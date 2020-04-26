import { PlayerEmojiResponse } from "src/modules/common/model/server.types";

export enum TimerMessageTypes {
    PlayerPromptExpired,
    PlayerResponsesExpired,
    PlayerVotesExpired,
    GameRestartExpired
}
export type PlayerPromptExpired = {
    type: TimerMessageTypes.PlayerPromptExpired;
    payload: {
        promptPlayerId: string;
        promptText?: string;
    };
};

export type PlayerResponsesExpired = {
    type: TimerMessageTypes.PlayerResponsesExpired;
    payload: {
        responses: PlayerEmojiResponse[];
    };
};

export type GameRestartExpired = {
    type: TimerMessageTypes.GameRestartExpired;
    payload: {
    };
};

export type PlayerVotesTally = {
    [playerId: string]: number;
};

export type PlayerVotesResponse = {
    playerId: string;
    playerIdVotes: PlayerVotesTally;
};

export type PlayerVotesExpired = {
    type: TimerMessageTypes.PlayerVotesExpired;
    payload: {
        responses: PlayerVotesResponse[];
    };
};

export type TimerSubscriptionMessage =
    | PlayerPromptExpired
    | PlayerResponsesExpired
    | PlayerVotesExpired
    | GameRestartExpired;