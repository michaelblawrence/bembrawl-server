import { Controller, HttpStatus, Post, Body, Res } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiResponse,
    ApiTags,
    ApiProperty,
} from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { ClientMessage } from "../../common/model/server.types";
import { PlayersData } from "../model";
import { PlayersService } from "../service";
import { boolean } from "joi";
import { Response } from "express";

class JoinRoomResp {
    @ApiProperty() public success: boolean;
    @ApiProperty() public isMaster: boolean;
    @ApiProperty() public isOpen: boolean;
    @ApiProperty() public playerIdx: number | null;
    @ApiProperty() public playerName: string | null;
}

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
        @Body() req: { sessionId: string },
        @Res() res: Response<{ valid: boolean; messages?: ClientMessage[] }>
    ): Promise<void> {
        const validSession = await this.playersService.keepAlive(req.sessionId);
        const messages =
            validSession &&
            (await this.playersService.popMessages(req.sessionId));
        if (!messages || !messages.length) {
            res.status(HttpStatus.PARTIAL_CONTENT).send({
                valid: validSession,
            });
            return;
        }

        res.status(HttpStatus.OK).send({
            valid: validSession,
            messages,
        });
    }

    @Post("join")
    @ApiResponse({ status: HttpStatus.OK, type: boolean })
    public async join(
        @Body() req: { sessionId: string; roomId: string }
    ): Promise<JoinRoomResp> {
        const result = await this.playersService.joinGame(
            req.sessionId,
            req.roomId
        );
        const { game, player } = result || {};
        return {
            success: !!game,
            isMaster: player ? player.isMaster() : false,
            isOpen: !!game && !game.closed(),
            playerIdx: player ? player.getJoinOrder() : null,
            playerName:
                (player && game?.getPlayerName(player.deviceId)) || null,
        };
    }

    @Post("name")
    @ApiResponse({ status: HttpStatus.OK, type: boolean })
    public async changePlayerName(
        @Body() req: { sessionId: string; playerName: string }
    ): Promise<boolean> {
        return await this.playersService.changePlayerName(
            req.sessionId,
            req.playerName
        );
    }

    @Post("complete")
    @ApiResponse({ status: HttpStatus.OK, type: boolean })
    public async completeRoom(
        @Body() req: { sessionId: string; roomId: string }
    ): Promise<boolean> {
        return await this.playersService.closeRoom(req.sessionId, req.roomId);
    }
}
