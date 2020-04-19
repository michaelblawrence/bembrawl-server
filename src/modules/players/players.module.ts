import { Module } from "@nestjs/common";

import { CommonModule } from "../common";
import { PlayersController } from "./controller/players.controller";
import {
    GameStateService,
    PlayersService,
    RoomIdStateProvider,
    GameRoomService,
    DateTimeProvider,
} from "./service";

@Module({
    imports: [CommonModule],
    providers: [
        PlayersService,
        DateTimeProvider,
        GameStateService,
        RoomIdStateProvider,
        GameRoomService,
    ],
    controllers: [PlayersController],
    exports: [],
})
export class PlayersModule {}
