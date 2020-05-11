import { PlayerCorrectGuessResponse } from "src/modules/common/model/server.types";

export enum TimerMessageTypes {
    PlayerResponsesExpired,
    GameRestartExpired,
    PlayerMatchPromptExpired
}

export type PlayerMatchPromptExpired = {
    type: TimerMessageTypes.PlayerMatchPromptExpired;
    payload: {
        promptPlayerId: string;
        promptText?: string;
        promptSubject?: string;
        promptEmoji: string[];
    };
};

export type PlayerResponsesExpired = {
    type: TimerMessageTypes.PlayerResponsesExpired;
    payload: {
        responses: PlayerCorrectGuessResponse[];
        validAnswer: string;
        promptSubject: string;
        promptPlayerId: string;
    };
};

export type GameRestartExpired = {
    type: TimerMessageTypes.GameRestartExpired;
    payload: {
    };
};

export type TimerSubscriptionMessage =
    | PlayerMatchPromptExpired
    | PlayerResponsesExpired
    | GameRestartExpired;