import { ApiProperty } from "@nestjs/swagger";

export class RegisterRoomReq {
    @ApiProperty() joinId: number;
}

export class NewPromptReq {
    @ApiProperty() sessionId: string;
    @ApiProperty() playerPrompt: string;
}

export class NewResponseReq {
    @ApiProperty() sessionId: string;
    @ApiProperty() responseEmoji: string[];
}

export class NewVotesReq {
    @ApiProperty() sessionId: string;
    @ApiProperty() votedPlayerIds: string[];
}
