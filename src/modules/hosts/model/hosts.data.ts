import { ApiProperty } from '@nestjs/swagger';
import { ICreatedHostGame } from "../../common/model/ICreatedHostGame";
import { IClientData } from "../../common/model/IPlayersData";

export class CreatedHostGame implements ICreatedHostGame {
    @ApiProperty()
    public readonly joinId: number;
    
    @ApiProperty()
    public readonly gameGuid: string;
}

export class HostsData implements IClientData {
    @ApiProperty()
    public readonly deviceId: string;

    @ApiProperty()
    public readonly sessionId: string;
}