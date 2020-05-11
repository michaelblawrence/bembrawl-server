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

import { GuessFirstService } from "../service/guessfirst.service";
import { GameStateService } from "src/modules/common/service";
import { bool } from "joi";
import {
    RegisterRoomReq,
    NewResponseReq,
    WrongAnswerReq,
    PromptMatchReq,
} from "../model";
import {
    PlayerGuard,
    HostGuard,
} from "src/modules/common/security/restricted.guard";
import { Token } from "src/modules/common/flow/token.decorator";
import { TokenPayload } from "src/modules/common/service/auth-token.service";

@Controller("guessfirst")
@ApiTags("guessfirst")
@ApiBearerAuth()
export class GuessFirstController {
    public constructor(
        private readonly gameStateService: GameStateService,
        private readonly guessfirstService: GuessFirstService
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
            return this.guessfirstService.register(game);
        } else {
            throw new HttpException(
                `Game room id=${emojiReq.joinId} not found`,
                HttpStatus.NOT_FOUND
            );
        }
    }

    @Post("match")
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async promptMatch(
        @Token() token: TokenPayload,
        @Body() promptMatchReq: PromptMatchReq
    ): Promise<boolean> {
        return this.guessfirstService.playerPromptMatchReceived(
            token.sessionId,
            promptMatchReq
        );
    }

    @Post("response")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async newResponse(
        @Token() token: TokenPayload,
        @Body() promptReq: NewResponseReq
    ): Promise<boolean> {
        return this.guessfirstService.playerCorrectResponseReceived(
            token.sessionId,
            promptReq.promptSubject,
            promptReq.answerText
        );
    }

    @Post("wrong")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async wrong(
        @Token() token: TokenPayload,
        @Body() promptReq: WrongAnswerReq
    ): Promise<boolean> {
        return this.guessfirstService.playerIncorrectResponseReceived(
            token.sessionId,
            promptReq.promptSubject,
            promptReq.answerText
        );
    }

    @Post("restart")
    @UseGuards(PlayerGuard)
    @ApiResponse({ status: HttpStatus.CREATED, type: bool })
    public async startNextRound(
        @Token() token: TokenPayload
    ): Promise<boolean> {
        return this.guessfirstService.beginNextGame(token.sessionId);
    }
}
