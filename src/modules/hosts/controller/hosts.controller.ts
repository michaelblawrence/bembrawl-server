import {
    Controller,
    HttpStatus,
    Post,
    Body,
    Res,
    Query,
    Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { HostsData } from "../model";
import { HostsService } from "../service";
import { CreatedHostGame, JoinGameReq } from "../model/hosts.data";
import { Response, Request } from "express";
import { AuthTokenService } from "src/modules/common/service/auth-token.service";
import { KeepAliveResp } from "src/modules/common/model/IKeepAlive";

@Controller("hosts")
@ApiTags("host")
@ApiBearerAuth()
export class HostsController {
    public constructor(
        private readonly authTokenService: AuthTokenService,
        private readonly logger: LoggerService,
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
        @Query() { roomId, createIfNone }: JoinGameReq    ): Promise<CreatedHostGame | null> {
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
    @ApiResponse({
        status: HttpStatus.OK | HttpStatus.NO_CONTENT,
        type: KeepAliveResp,
    })
    public async keepalive(
        @Req() req: Request,
        @Res() res: Response<KeepAliveResp>
    ) {
        const session = this.authTokenService.validateToken(req);
        const messages = await this.hostsService.popMessages(session.sessionId);
        const keepAliveStatus = await this.hostsService.keepAlive(
            session.sessionId
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
