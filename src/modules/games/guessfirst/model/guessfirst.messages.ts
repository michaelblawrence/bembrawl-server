import { PlayerCorrectGuessResponse } from "src/modules/common/model/server.types";

export enum TimerMessageTypes {
    PlayerPromptExpired,
    PlayerResponsesExpired,
    GameRestartExpired,
    PlayerMatchPromptExpired
}
export type PlayerPromptExpired = {
    type: TimerMessageTypes.PlayerPromptExpired;
    payload: {
        promptPlayerId: string;
        promptText?: string;
        promptSubject?: string;
    };
};

export type PlayerMatchPromptExpired = {
    type: TimerMessageTypes.PlayerMatchPromptExpired;
    payload: {
        promptPlayerId: string;
        promptText?: string;
        promptSubject?: string;
        promptEmoji?: string;
    };
};

export type PlayerResponsesExpired = {
    type: TimerMessageTypes.PlayerResponsesExpired;
    payload: {
        responses: PlayerCorrectGuessResponse[];
        validAnswer: string;
        promptText: string;
    };
};

export type GameRestartExpired = {
    type: TimerMessageTypes.GameRestartExpired;
    payload: {
    };
};

export type TimerSubscriptionMessage =
    | PlayerPromptExpired
    | PlayerMatchPromptExpired
    | PlayerResponsesExpired
    | GameRestartExpired;