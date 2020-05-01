import { Injectable, UnauthorizedException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

import { PlayersState } from "../model/PlayersState";
import {
    toTokenValue,
    extractAuthPayload,
    extractTokenPayload,
} from "src/modules/common";
import { Role } from "src/modules/tokens";
import { IClientData } from "../model/IPlayersData";
import { Request } from "express";

export interface TokenPayload {
    sessionId: string;
    deviceId: string;
    role: Role;
}

@Injectable()
export class AuthTokenService {
    public createSessionId(): string {
        return uuidv4();
    }

    public createClientToken(client: IClientData): string {
        return toTokenValue(Role.RESTRICTED, {
            sessionId: client.sessionId,
            deviceId: client.deviceId,
        });
    }

    public validateToken(request: Request): TokenPayload | null {
        const payload = extractTokenPayload<TokenPayload>(request);
        if (!payload || !payload.sessionId) return null;
        return payload;
    }
}
