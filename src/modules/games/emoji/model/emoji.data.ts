import { ApiProperty } from "@nestjs/swagger";

export class RegisterRoomReq {
    @ApiProperty() joinId: number;
}

export class NewPromptReq {
    @ApiProperty() playerPrompt: string;
}

export class NewResponseReq {
    @ApiProperty() responseEmoji: string[];
}

export class NewVotesReq {
    @ApiProperty() votedPlayerIds: string[];
}
