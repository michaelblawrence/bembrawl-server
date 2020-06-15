import { ApiProperty } from "@nestjs/swagger";

export class RegisterRoomReq {
    @ApiProperty() joinId: number;
}

export class PromptMatchReq {
    @ApiProperty() promptSubject: string;
    @ApiProperty() promptEmoji: string[];
    @ApiProperty() promptAnswer: string;
}

export class NewResponseReq {
    @ApiProperty() promptSubject: string;
    @ApiProperty() answerText: string;
}

export class WrongAnswerReq {
    @ApiProperty() promptSubject: string;
    @ApiProperty() answerText: string;
}
