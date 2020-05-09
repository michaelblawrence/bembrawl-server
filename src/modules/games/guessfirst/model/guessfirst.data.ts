import { ApiProperty } from "@nestjs/swagger";

export class RegisterRoomReq {
    @ApiProperty() joinId: number;
}

export class NewPromptReq {
    @ApiProperty() promptSubject: string;
    @ApiProperty() playerPrompt: string;
}

export class PromptMatchReq {
    @ApiProperty() promptSubject: string;
    @ApiProperty() promptEmoji: string;
    @ApiProperty() promptAnswer: string;
}

export class NewResponseReq {
    @ApiProperty() promptText: string;
    @ApiProperty() answerText: string;
}

export class WrongAnswerReq {
    @ApiProperty() promptText: string;
    @ApiProperty() answerText: string;
}
