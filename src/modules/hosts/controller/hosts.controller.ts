import {
    Controller,
    HttpStatus,
    Post,
    Body,
    Res,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { HostsData } from "../model";
import { HostsService } from "../service";
import { CreatedHostGame, JoinGameReq } from "../model/hosts.data";
import { Response } from "express";
import {
    AuthTokenService,
    TokenPayload,
} from "src/modules/common/service/auth-token.service";
import { KeepAliveResp } from "src/modules/common/model/IKeepAlive";
import { HostGuard } from "src/modules/common/security/restricted.guard";
import { Token } from "src/modules/common/flow/token.decorator";

@Controller("hosts")
@ApiTags("host")
@ApiBearerAuth()
export class HostsController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly authTokenService: AuthTokenService,
        private readonly hostsService: HostsService
    ) {}

    @Post("register")
    @ApiResponse({ status: HttpStatus.CREATED, type: CreatedHostGame })
    public async register(
        @Body() hostReq: HostsData
    ): Promise<CreatedHostGame | null> {
        const sessionId = this.authTokenService.createSessionId();
        const created = await this.hostsService.create({
            deviceId: hostReq.deviceId,
            sessionId: sessionId,
        });
        if (!created) return null;
        const token = this.authTokenService.createClientToken(created);
        return {
            joinId: created.joinId,
            token,
        };
    }

    @Post("join")
    @ApiResponse({ status: HttpStatus.CREATED, type: CreatedHostGame })
    public async join(
        @Body() hostReq: HostsData,
        @Query() { roomId, createIfNone }: JoinGameReq
    ): Promise<CreatedHostGame | null> {
        const sessionId = this.authTokenService.createSessionId();
        const joined = await this.hostsService.joinRoom({
            deviceId: hostReq.deviceId,
            sessionId: sessionId,
            joinId: roomId,
        });
        if (joined) {
            this.logger.info(
                `Created new host with ID ${hostReq.deviceId}:${sessionId} joining room id = ${joined.joinId}`
            );
            const token = this.authTokenService.createClientToken(joined);
            return {
                joinId: joined.joinId,
                token,
            };
        }
        if (!createIfNone) return null;

        this.logger.info(
            `Could not join new host with ID ${hostReq.deviceId}:${sessionId} to room id = ${roomId}. Creating room...`
        );
        const created = await this.hostsService.create({
            deviceId: hostReq.deviceId,
            sessionId: sessionId,
        });
        if (!created) return null;
        const token = this.authTokenService.createClientToken(created);
        return {
            joinId: created?.joinId,
            token,
        };
    }

    @Post("keepalive")
    @UseGuards(HostGuard)
    @ApiResponse({
        status: HttpStatus.OK | HttpStatus.NO_CONTENT,
        type: KeepAliveResp,
    })
    public async keepalive(
        @Token() token: TokenPayload,
        @Res() res: Response<KeepAliveResp>
    ) {
        const messages = await this.hostsService.popMessages(token.sessionId);
        const keepAliveStatus = await this.hostsService.keepAlive(
            token.sessionId
        );

        if (!messages.length) {
            res.status(HttpStatus.PARTIAL_CONTENT).send({
                valid: keepAliveStatus,
            });
            return;
        }

        return res.status(HttpStatus.OK).send({
            valid: keepAliveStatus,
            messages,
        });
    }
}
