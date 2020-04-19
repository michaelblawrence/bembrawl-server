import { Module } from "@nestjs/common";

import { LogInterceptor } from "./flow";
import { configProvider, LoggerService } from "./provider";
import {
    GameStateService,
    RoomIdStateProvider,
    GameRoomService,
    DateTimeProvider,
} from "./service";
@Module({
    providers: [
        configProvider,
        LoggerService,
        LogInterceptor,
        GameStateService,
        RoomIdStateProvider,
        GameRoomService,
        DateTimeProvider,
    ],
    exports: [
        configProvider,
        LoggerService,
        LogInterceptor,
        GameStateService,
        RoomIdStateProvider,
        GameRoomService,
        DateTimeProvider,
    ],
})
export class CommonModule {}
