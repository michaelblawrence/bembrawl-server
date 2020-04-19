import { Controller, Get, HttpStatus, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiUseTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { PlayersData } from "../model";
import { PlayersService } from "../service";

@Controller("players")
@ApiUseTags("player")
@ApiBearerAuth()
export class PlayersController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly playersService: PlayersService
    ) {}

    @Post("register")
    @ApiResponse({ status: HttpStatus.CREATED, type: PlayersData })
    public async register(
        @Body() playerReq: PlayersData
    ): Promise<PlayersData> {
        const player = await this.playersService.create({
            deviceId: playerReq.deviceId,
            sessionId: playerReq.sessionId,
        });
        this.logger.info(
            `Created new player with ID ${player.deviceId}:${player.sessionId}`
        );
        return player;
    }

    @Post("keepalive")
    @ApiResponse({ status: HttpStatus.CREATED, type: PlayersData })
    public async keepalive(@Body() sessionId: string): Promise<boolean> {
        return await this.playersService.keepAlive(sessionId);
    }

    @Get()
    @ApiResponse({ status: HttpStatus.OK, isArray: true, type: PlayersData })
    public async test(): Promise<string> {
        return "test";
    }
}
