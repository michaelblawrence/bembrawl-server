import {
    Controller,
    HttpStatus,
    Post,
    Body,
    HttpException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../../common/provider";
import { EmojiService } from "../service/emoji.service";
import { GameStateService } from "src/modules/common/service";
import { bool } from "joi";
import {
    RegisterRoomReq,
    NewPromptReq,
    NewResponseReq,
    NewVotesReq,
} from "../model";

@Controller("emoji")
@ApiTags("emoji")
@ApiBearerAuth()
export class EmojiController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly gameStateService: GameStateService,
        private readonly emojiService: EmojiService
    ) {}

    @Post("register")
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async register(@Body() emojiReq: RegisterRoomReq): Promise<boolean> {
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
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newPrompt(@Body() promptReq: NewPromptReq): Promise<boolean> {
        return this.emojiService.playerPromptReceived(
            promptReq.sessionId,
            promptReq.playerPrompt
        );
    }

    @Post("response")
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newResponse(
        @Body() promptReq: NewResponseReq
    ): Promise<boolean> {
        return this.emojiService.playerResponseReceived(
            promptReq.sessionId,
            promptReq.responseEmoji
        );
    }

    @Post("votes")
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newVotes(@Body() promptReq: NewVotesReq): Promise<boolean> {
        return this.emojiService.playerVoteReceived(
            promptReq.sessionId,
            promptReq.votedPlayerIds
        );
    }
}
