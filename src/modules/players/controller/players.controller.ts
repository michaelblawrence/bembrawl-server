import {
    Controller,
    HttpStatus,
    Post,
    Body,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../common/provider";
import { PlayersData } from "../model";
import { PlayersService } from "../service";
import { Response } from "express";
import { GuestGuard } from "src/modules/common";
import {
    PlayersResp,
    JoinRoomResp,
    JoinRoomReq,
    ChangePlayerNameReq,
} from "../model/players.data";
import {
    AuthTokenService,
    TokenPayload,
} from "src/modules/common/service/auth-token.service";
import { PlayerGuard } from "src/modules/common/security/restricted.guard";
import { Token } from "src/modules/common/flow/token.decorator";
import { KeepAliveResp } from "src/modules/common/model/IKeepAlive";
import { PlayerNamePipe } from "../flow";
import { Boolean } from "../../common/flow/types";
import {
    ClientRegPipe,
    RoomIdPipe,
} from "src/modules/common/flow/joi-validation.pipe";

@Controller("players")
@ApiTags("player")
export class PlayersController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly authTokenService: AuthTokenService,
        private readonly playersService: PlayersService
    ) {}

    @Post("register")
    @UseGuards(GuestGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: PlayersResp })
    public async register(
        @Body(ClientRegPipe) playerReq: PlayersData
    ): Promise<PlayersResp> {
        const sessionId = this.authTokenService.createSessionId();

        const player = await this.playersService.create({
            deviceId: playerReq.deviceId,
            sessionId,
        });
        this.logger.info(
            `Created new player with ID ${player.sessionId}:${player.deviceId}`
        );
        const token = this.authTokenService.createClientToken(player);
        return {
            deviceId: player.deviceId,
            token,
        };
    }

    @Post("keepalive")
    @UseGuards(PlayerGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: HttpStatus.OK, type: KeepAliveResp })
    public async keepalive(
        @Token() token: TokenPayload,
        @Res() res: Response<KeepAliveResp>
    ): Promise<void> {
        const validSession = await this.playersService.keepAlive(
            token.sessionId
        );
        const messages =
            validSession &&
            (await this.playersService.popMessages(token.sessionId));
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
    @ApiBearerAuth()
    @ApiResponse({ status: HttpStatus.OK, type: JoinRoomResp })
    public async join(
        @Token() token: TokenPayload,
        @Body(RoomIdPipe) input: JoinRoomReq
    ): Promise<JoinRoomResp> {
        const result = await this.playersService.joinGame(
            token.sessionId,
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
    @ApiBearerAuth()
    @ApiResponse({ status: HttpStatus.OK, schema: Boolean() })
    public async changePlayerName(
        @Token() token: TokenPayload,
        @Body(PlayerNamePipe) input: ChangePlayerNameReq
    ): Promise<boolean> {
        return await this.playersService.changePlayerName(
            token.sessionId,
            input.playerName
        );
    }

    @Post("complete")
    @UseGuards(PlayerGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: HttpStatus.OK, schema: Boolean() })
    public async completeRoom(
        @Token() token: TokenPayload,
        @Body(RoomIdPipe) playerReq: { roomId: string }
    ): Promise<boolean> {
        return await this.playersService.closeRoom(
            token.sessionId,
            playerReq.roomId
        );
    }
}
