import { ApiModelProperty } from "@nestjs/swagger";

export interface IPlayersData {
    deviceId: string;
    sessionId: string;
}

export class PlayersData implements IPlayersData {
    @ApiModelProperty()
    public readonly deviceId: string;

    @ApiModelProperty()
    public readonly sessionId: string;
}
