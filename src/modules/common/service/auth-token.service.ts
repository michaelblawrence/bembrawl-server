import { Injectable, UnauthorizedException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import { PlayersState } from "../model/PlayersState";
import {
    toTokenValue,
    extractAuthPayload,
    extractTokenPayload,
} from "src/modules/common";
import { Role } from "src/modules/tokens";

export interface TokenPayload {
    sessionId: string;
    deviceId: string;
}

@Injectable()
export class AuthTokenService {
    public createSessionId(): string {
        return uuidv4();
    }

    public createPlayerToken(playerReq: PlayersState): string {
        return toTokenValue(Role.RESTRICTED, {
            sessionId: playerReq.sessionId,
            deviceId: playerReq.deviceId,
        });
    }

    public validateToken(req: any): TokenPayload {
        const payload = extractTokenPayload<TokenPayload & { role: Role }>(req);
        if (!payload || !payload.sessionId) throw new UnauthorizedException();
        return payload;
    }
}
