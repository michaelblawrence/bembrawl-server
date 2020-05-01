import { ApiProperty } from "@nestjs/swagger";
import { ClientMessage } from "./server.types";

export interface IKeepAlive {
    sessionId: string;
    getLastKeepAliveMs: () => number;
    keepAliveReceived: () => void;
}

export class KeepAliveResp {
    @ApiProperty()
    valid: boolean;

    @ApiProperty()
    messages?: ClientMessage[];
}