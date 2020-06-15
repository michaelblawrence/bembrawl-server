import { ApiProperty } from "@nestjs/swagger";

export class RegisterRoomReq {
    @ApiProperty() joinId: number;
}

export class NewPromptReq {
    @ApiProperty() promptSubject: string;
    @ApiProperty() playerPrompt: string;
    @ApiProperty() promptSubject: string;
}

export class PromptMatchReq {
    @ApiProperty() promptSubject: string;
    @ApiProperty() promptEmoji: string;
    @ApiProperty() promptAnswer: string;
}

export class NewResponseReq {
    @ApiProperty() responseEmoji: string[];
}

export class NewVotesReq {
    @ApiProperty() votedPlayerIds: string[];
}
