import { Module } from "@nestjs/common";

import { CommonModule } from "../../common";
import { EmojiController } from "./controller/emoji.controller";
import { HostsService } from "./service";

@Module({
    imports: [CommonModule],
    providers: [HostsService],
    controllers: [EmojiController],
    exports: [],
})
export class EmojiModule {}
