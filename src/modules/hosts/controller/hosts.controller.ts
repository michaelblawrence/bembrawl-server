import { Controller, HttpStatus, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { HostsData } from "../model";
import { HostsService } from "../service";
import { boolean } from "joi";
import { CreatedHostGame } from "../model/hosts.data";
import { ClientMessage } from "src/modules/common/model/Message";

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

    @Post("keepalive")
    @ApiResponse({ status: HttpStatus.OK, type: boolean }) // TODO: fix
    public async keepalive(
        @Body() req: { sessionId: string }
    ): Promise<{ valid: boolean; messages?: ClientMessage[] }> {
        const messages = await this.hostsService.popMessages(req.sessionId);
        return {
            valid: await this.hostsService.keepAlive(req.sessionId),
            messages
        };
    }
}
