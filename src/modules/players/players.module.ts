import { Module } from "@nestjs/common";

import { CommonModule } from "../common";
import { PlayersController } from "./controller/players.controller";
import { PlayersService } from "./service/players.service";

@Module({
    imports: [CommonModule],
    providers: [PlayersService],
    controllers: [PlayersController],
    exports: [],
})
export class PlayersModule {}
