import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

import { Role } from "../../tokens";
import { extractTokenPayload } from "./security-utils";
import { TokenPayload } from "../service/auth-token.service";
import { GameStateService } from "../service";

@Injectable()
export class RestrictedGuard implements CanActivate {
    public canActivate(context: ExecutionContext): boolean {
        const payload = extractTokenPayload(
            context.switchToHttp().getRequest()
        );

        if (!payload) {
            return false;
        }

        return payload.role === Role.RESTRICTED;
    }
}

@Injectable()
export class PlayerGuard implements CanActivate {
    public constructor(private readonly gameStateService: GameStateService) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const payload = extractTokenPayload<TokenPayload>(request);

        if (!payload || payload.role !== Role.RESTRICTED) return false;

        const player = await this.gameStateService.getPlayer(payload.sessionId);
        if (player?.deviceId && player.deviceId === payload.deviceId)
            return true;

        return false;
    }
}

@Injectable()
export class HostGuard implements CanActivate {
    public constructor(private readonly gameStateService: GameStateService) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const payload = extractTokenPayload<TokenPayload>(request);

        if (!payload || payload.role !== Role.RESTRICTED) return false;

        const host = await this.gameStateService.getHost(payload.sessionId);
        if (host?.deviceId && host.deviceId === payload.deviceId)
            return true;

        return false;
    }
}
