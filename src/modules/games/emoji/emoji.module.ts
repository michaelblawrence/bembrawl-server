import { Module } from "@nestjs/common";

import { CommonModule } from "../../common";
import { EmojiController } from "./controller/emoji.controller";
import { EmojiService, EmojiGameLogicService } from "./service";
import { EmojiGameTimerService, EmojiGameTimerProvider } from "./service/emoji-game-timer.service";
import { EmojiMessagingService } from "./service/emoji-messaging.service";

@Module({
    imports: [CommonModule],
    providers: [
        EmojiGameTimerProvider,
        EmojiGameTimerService,
        EmojiMessagingService,
        EmojiGameLogicService,
        EmojiService,
    ],
    controllers: [EmojiController],
    exports: [EmojiService],
})
export class EmojiModule {}
