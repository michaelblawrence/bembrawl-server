import { Controller, HttpStatus, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse, ApiTags } from "@nestjs/swagger";

import { LoggerService } from "../../../common/provider";
import { CreatedEmojiGame, EmojiData } from "../model/emoji.data";
import { EmojiService } from "../service/emoji.service";

@Controller("hosts")
@ApiTags("host")
@ApiBearerAuth()
export class EmojiController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly emojiService: EmojiService
    ) {}

    @Post("register")
    @ApiResponse({ status: HttpStatus.CREATED, type: CreatedEmojiGame })
    public async register(@Body() hostReq: EmojiData): Promise<void> {}
}
