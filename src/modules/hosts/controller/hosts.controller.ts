import { Controller, HttpStatus, Post, Body, Res, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { HostsData } from "../model";
import { HostsService } from "../service";
import { boolean } from "joi";
import {
    CreatedHostGame,
    JoinGameReq,
} from "../model/hosts.data";
import { ClientMessage } from "src/modules/common/model/server.types";
import { Response } from "express";

@Controller("hosts")
@ApiTags("host")
@ApiBearerAuth()
export class HostsController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly hostsService: HostsService
    ) {}

    @Post("register")
    @ApiResponse({ status: HttpStatus.CREATED, type: CreatedHostGame })
    public async register(
        @Body() hostReq: HostsData
    ): Promise<CreatedHostGame | null> {
        const created = await this.hostsService.create({
            deviceId: hostReq.deviceId,
            sessionId: hostReq.sessionId,
        });
        if (created) {
            this.logger.info(
                `Created new host with ID ${hostReq.deviceId}:${hostReq.sessionId} in room id = ${created.joinId}`
            );
        }
        return created;
    }

    @Post("join")
    @ApiResponse({ status: HttpStatus.CREATED, type: CreatedHostGame })
    public async join(
        @Body() hostReq: HostsData,
        @Query() { roomId, createIfNone }: JoinGameReq
    ): Promise<CreatedHostGame | null> {
        const created = await this.hostsService.joinRoom({
            ...hostReq,
            joinId: roomId,
        });
        if (created) {
            this.logger.info(
                `Created new host with ID ${hostReq.deviceId}:${hostReq.sessionId} joining room id = ${created.joinId}`
            );
            return created;
        }
        if (createIfNone) {
            this.logger.info(
                `Could not join new host with ID ${hostReq.deviceId}:${hostReq.sessionId} to room id = ${roomId}. Creating room...`
            );
            return await this.register(hostReq);
        }
        return null;
    }

    @Post("keepalive")
    @ApiResponse({
        status: HttpStatus.OK | HttpStatus.NO_CONTENT,
        type: boolean, // TODO: fix
    })
    public async keepalive(
        @Body() req: { sessionId: string },
        @Res() res: Response<{ valid: boolean; messages?: ClientMessage[] }>
    ) {
        const messages = await this.hostsService.popMessages(req.sessionId);
        const keepAliveStatus = await this.hostsService.keepAlive(
            req.sessionId
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
