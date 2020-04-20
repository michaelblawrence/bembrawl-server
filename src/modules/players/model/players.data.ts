import { ApiProperty } from "@nestjs/swagger";
import { IClientData } from "../../common/model/IPlayersData";

export class PlayersData implements IClientData {
    @ApiProperty()
    public readonly deviceId: string;
    
    @ApiProperty()
    public readonly sessionId: string;
}
