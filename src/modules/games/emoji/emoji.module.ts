import { Module } from "@nestjs/common";

import { CommonModule } from "../../common";
import { EmojiController } from "./controller/emoji.controller";
import { EmojiService } from "./service";

@Module({
    imports: [CommonModule],
    providers: [EmojiService],
    controllers: [EmojiController],
    exports: [],
})
export class EmojiModule {}
