import { ApiProperty } from "@nestjs/swagger";
import { guid } from "src/modules/common/flow/types";

export class PlayersData {
    @ApiProperty(guid())
    public readonly deviceId: string;
}

export class JoinRoomReq {
    @ApiProperty()
    roomId: string;
}

export class ChangePlayerNameReq {
    @ApiProperty()
    playerName: string;
}

export class JoinRoomResp {
    @ApiProperty()
    public readonly success: boolean;

    @ApiProperty()
    public readonly isMaster: boolean;

    @ApiProperty()
    public readonly isOpen: boolean;

    @ApiProperty()
    public readonly playerIdx: number | null;

    @ApiProperty()
    public readonly playerName: string | null;
}

export class PlayersResp {
    @ApiProperty()
    public readonly deviceId: string;

    @ApiProperty()
    public readonly token: string;
}

