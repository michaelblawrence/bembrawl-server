import { ApiModelProperty } from "@nestjs/swagger";
import { IPlayersData } from "../../common/model/IPlayersData";

export class PlayersData implements IPlayersData {
    @ApiModelProperty()
    public readonly deviceId: string;

    @ApiModelProperty()
    public readonly sessionId: string;
}
