import { ApiProperty } from "@nestjs/swagger";

export class CreatedHostGame {
    @ApiProperty()
    public readonly joinId: number;

    @ApiProperty()
    public readonly token: string;
}

export class HostsData {
    @ApiProperty()
    public readonly deviceId: string;
}

export interface IJoinGameData {
    deviceId: string;
    sessionId: string;
    joinId: number;
}

export class JoinGameReq {
    @ApiProperty()
    public readonly createIfNone: boolean;

    @ApiProperty()
    public readonly roomId: number;
}
