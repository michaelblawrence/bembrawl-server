import {
    Controller,
    HttpStatus,
    Post,
    Body,
    Res,
    UseGuards,
    Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { PlayersData } from "../model";
import { PlayersService } from "../service";
import { boolean } from "joi";
import { Response } from "express";
import { GuestGuard } from "src/modules/common";
import {
    PlayersResp,
    KeepAliveResp,
    JoinRoomResp,
} from "../model/players.data";
import { AuthTokenService } from "src/modules/common/service/auth-token.service";
import { PlayerGuard } from "src/modules/common/security/restricted.guard";

@Controller("players")
@ApiTags("player")
@ApiBearerAuth()
export class PlayersController {
    public constructor(
        private readonly authTokenService: AuthTokenService,
        private readonly logger: LoggerService,
        private readonly playersService: PlayersService
    ) {}

    @Post("register")
    @UseGuards(GuestGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: PlayersResp })
    public async register(
        @Body() playerReq: PlayersData
    ): Promise<PlayersResp> {
        const sessionId = this.authTokenService.createSessionId();

        const player = await this.playersService.create({
            deviceId: playerReq.deviceId,
            sessionId
        });
        this.logger.info(
            `Created new player with ID ${player.sessionId}:${player.deviceId}`
        );
        const token = this.authTokenService.createPlayerToken(player);
        return {
            deviceId: player.deviceId,
            token,
        };
    }

    @Post("keepalive")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.OK, type: KeepAliveResp }) // TODO: fix
    public async keepalive(
        @Req() req: any,
        @Res() res: Response<KeepAliveResp>
    ): Promise<void> {
        const session = this.authTokenService.validateToken(req);

        const validSession = await this.playersService.keepAlive(
            session.sessionId
        );
        const messages =
            validSession &&
            (await this.playersService.popMessages(session.sessionId));
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
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.OK, type: JoinRoomResp })
    public async join(
        @Body() input: { roomId: string },
        @Req() req: any
    ): Promise<JoinRoomResp> {
        const session = this.authTokenService.validateToken(req);
        const result = await this.playersService.joinGame(
            session.sessionId,
            input.roomId
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
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.OK, type: boolean })
    public async changePlayerName(
        @Body() input: { playerName: string },
        @Req() req: any
    ): Promise<boolean> {
        const session = this.authTokenService.validateToken(req);
        return await this.playersService.changePlayerName(
            session.sessionId,
            input.playerName
        );
    }

    @Post("complete")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.OK, type: boolean })
    public async completeRoom(
        @Body() req: { roomId: string }
    ): Promise<boolean> {
        const session = this.authTokenService.validateToken(req);
        return await this.playersService.closeRoom(
            session.sessionId,
            req.roomId
        );
    }
}
