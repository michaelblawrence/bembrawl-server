import { ApiModelProperty } from "@nestjs/swagger";
import { IClientData } from "../../common/model/IPlayersData";

export class PlayersData implements IClientData {
    @ApiModelProperty()
    public readonly deviceId: string;

    @ApiModelProperty()
    public readonly sessionId: string;
}
