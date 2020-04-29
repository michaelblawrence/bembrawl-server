import { ApiProperty } from "@nestjs/swagger";
import { IClientData } from "../../common/model/IPlayersData";
import { ClientMessage } from "src/modules/common/model/server.types";

export class PlayersData {
    @ApiProperty()
    public readonly deviceId: string;
}

export class KeepAliveResp {
    @ApiProperty()
    valid: boolean;

    @ApiProperty()
    messages?: ClientMessage[];
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
