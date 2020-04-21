import { Controller, HttpStatus, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { ClientMessage } from "../../common/model/Message";
import { PlayersData } from "../model";
import { PlayersService } from "../service";
import { boolean } from "joi";

@Controller("players")
@ApiTags("player")
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
            `Created new player with ID ${player.sessionId}:${player.deviceId}`
        );
        return player;
    }

    @Post("keepalive")
    @ApiResponse({ status: HttpStatus.OK, type: boolean }) // TODO: fix
    public async keepalive(
        @Body() req: { sessionId: string }
    ): Promise<{ valid: boolean; messages?: ClientMessage[] }> {
        const valid = await this.playersService.keepAlive(req.sessionId);
        const messages = await this.playersService.popMessages(req.sessionId);
        return {
            valid,
            messages: messages,
        };
    }

    @Post("join")
    @ApiResponse({ status: HttpStatus.OK, type: boolean })
    public async join(
        @Body() req: { sessionId: string; roomId: string }
    ): Promise<{ success: boolean; isMaster: boolean; playerIdx: number | null }> {
        const { game, player } = await this.playersService.joinGame(
            req.sessionId,
            req.roomId
        ) || {};
        return {
            success: !!game,
            isMaster: player ? player.isMaster() : false,
            playerIdx: player ? player.getJoinOrder() : null,
        };
    }

    @Post("complete")
    @ApiResponse({ status: HttpStatus.OK, type: boolean })
    public async completeRoom(
        @Body() req: { sessionId: string; roomId: string }
    ): Promise<boolean> {
        return await this.playersService.closeRoom(req.sessionId, req.roomId);
    }
}
