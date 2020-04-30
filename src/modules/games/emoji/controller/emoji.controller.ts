import {
    Controller,
    HttpStatus,
    Post,
    Body,
    HttpException,
    UseGuards,
    Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { EmojiService } from "../service/emoji.service";
import { GameStateService } from "src/modules/common/service";
import { bool } from "joi";
import {
    RegisterRoomReq,
    NewPromptReq,
    NewResponseReq,
    NewVotesReq,
} from "../model";
import { PlayerGuard, HostGuard } from "src/modules/common/security/restricted.guard";
import { Request } from "express";
import { AuthTokenService } from "src/modules/common/service/auth-token.service";

@Controller("emoji")
@ApiTags("emoji")
@ApiBearerAuth()
export class EmojiController {
    public constructor(
        private readonly authTokenService: AuthTokenService,
        private readonly gameStateService: GameStateService,
        private readonly emojiService: EmojiService
    ) {}

    @Post("register")
    @UseGuards(HostGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async register(
        @Req() req: Request,
        @Body() emojiReq: RegisterRoomReq
    ): Promise<boolean> {
        const game = await this.gameStateService.getGameRoom(emojiReq.joinId);
        if (game) {
            return this.emojiService.register(game);
        } else {
            throw new HttpException(
                `Game room id=${emojiReq.joinId} not found`,
                HttpStatus.NOT_FOUND
            );
        }
    }

    @Post("prompt")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newPrompt(
        @Req() req: Request,
        @Body() promptReq: NewPromptReq
    ): Promise<boolean> {
        const session = this.authTokenService.validateToken(req);
        return this.emojiService.playerPromptReceived(
            session.sessionId,
            promptReq.playerPrompt
        );
    }

    @Post("response")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newResponse(
        @Req() req: Request,
        @Body() promptReq: NewResponseReq
    ): Promise<boolean> {
        const session = this.authTokenService.validateToken(req);
        return this.emojiService.playerResponseReceived(
            session.sessionId,
            promptReq.responseEmoji
        );
    }

    @Post("votes")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newVotes(
        @Req() req: Request,
        @Body() promptReq: NewVotesReq
    ): Promise<boolean> {
        const session = this.authTokenService.validateToken(req);
        return this.emojiService.playerVoteReceived(
            session.sessionId,
            promptReq.votedPlayerIds
        );
    }
}
