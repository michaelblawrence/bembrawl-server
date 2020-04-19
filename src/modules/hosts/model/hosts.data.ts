import { ApiModelProperty } from "@nestjs/swagger";
import { ICreatedHostGame } from "../../common/model/ICreatedHostGame";
import { IClientData } from "../../common/model/IPlayersData";

export class CreatedHostGame implements ICreatedHostGame {
    @ApiModelProperty()
    public readonly joinId: number;
    @ApiModelProperty()
    public readonly gameGuid: string;
}

export class HostsData implements IClientData {
    @ApiModelProperty()
    public readonly deviceId: string;

    @ApiModelProperty()
    public readonly sessionId: string;
}