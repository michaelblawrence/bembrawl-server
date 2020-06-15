import { ApiProperty } from "@nestjs/swagger";
import { guid } from "src/modules/common/flow/types";

export class CreatedHostGame {
    @ApiProperty()
    public readonly joinId: number;

    @ApiProperty()
    public readonly token: string;
}

export class HostsData {
    @ApiProperty(guid())
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
