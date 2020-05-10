import {
    Controller,
    HttpStatus,
    Post,
    Body,
    HttpException,
    UseGuards,
    UnauthorizedException,
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
    PromptMatchReq,
} from "../model";
import {
    PlayerGuard,
    HostGuard,
} from "src/modules/common/security/restricted.guard";
import { Token } from "src/modules/common/flow/token.decorator";
import { TokenPayload } from "src/modules/common/service/auth-token.service";

@Controller("emoji")
@ApiTags("emoji")
@ApiBearerAuth()
export class EmojiController {
    public constructor(
        private readonly gameStateService: GameStateService,
        private readonly emojiService: EmojiService
    ) {}

    @Post("register")
    @UseGuards(HostGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async register(
        @Token() token: TokenPayload,
        @Body() emojiReq: RegisterRoomReq
    ): Promise<boolean> {
        const host = await this.gameStateService.getHost(token.sessionId);
        const game = await this.gameStateService.getGameRoom(emojiReq.joinId);
        if (host?.getGameGuid() !== game?.guid)
            throw new UnauthorizedException();

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
        @Token() token: TokenPayload,
        @Body() promptReq: NewPromptReq
    ): Promise<boolean> {
        return this.emojiService.playerPromptReceived(
            token.sessionId,
            promptReq.playerPrompt,
            promptReq.promptSubject
        );
    }

    @Post("response")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newResponse(
        @Token() token: TokenPayload,
        @Body() promptReq: NewResponseReq
    ): Promise<boolean> {
        return this.emojiService.playerResponseReceived(
            token.sessionId,
            promptReq.responseEmoji
        );
    }

    @Post("votes")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newVotes(
        @Token() token: TokenPayload,
        @Body() promptReq: NewVotesReq
    ): Promise<boolean> {
        return this.emojiService.playerVoteReceived(
            token.sessionId,
            promptReq.votedPlayerIds
        );
    }
}
