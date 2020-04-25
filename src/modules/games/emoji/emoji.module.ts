import { Module } from "@nestjs/common";

import { CommonModule } from "../../common";
import { EmojiController } from "./controller/emoji.controller";
import { EmojiService, EmojiGameLogicService } from "./service";
import { EmojiGameTimerService } from "./service/emoji-game-timer.service";
import { EmojiMessagingService } from "./service/emoji-messaging.service";

@Module({
    imports: [CommonModule],
    providers: [EmojiGameTimerService, EmojiMessagingService, EmojiGameLogicService, EmojiService],
    controllers: [EmojiController],
    exports: [EmojiService],
})
export class EmojiModule {}
