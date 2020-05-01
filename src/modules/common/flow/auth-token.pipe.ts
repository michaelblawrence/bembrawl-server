import { Injectable, PipeTransform, ArgumentMetadata, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { TokenPayload, AuthTokenService } from "../service/auth-token.service";

@Injectable()
export class AuthToken implements PipeTransform<Request, TokenPayload> {
    public constructor(private readonly authTokenService: AuthTokenService) { }
    transform(value: Request, metadata: ArgumentMetadata): TokenPayload {
        const token = this.authTokenService.validateToken(value);
        if (!token)
            throw new UnauthorizedException();
        return token;
    }
}
