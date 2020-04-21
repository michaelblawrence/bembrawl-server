import { Module } from "@nestjs/common";

import { LogInterceptor } from "./flow";
import { configProvider, LoggerService } from "./provider";
import {
    GameStateService,
    RoomIdStateProvider,
    GameRoomService,
    DateTimeProvider,
} from "./service";
import { GameMessagingService } from "./service/game-messaging.service";
@Module({
    providers: [
        configProvider,
        LoggerService,
        LogInterceptor,
        GameStateService,
        RoomIdStateProvider,
        GameRoomService,
        GameMessagingService,
        DateTimeProvider,
    ],
    exports: [
        configProvider,
        LoggerService,
        LogInterceptor,
        GameStateService,
        RoomIdStateProvider,
        GameRoomService,
        GameMessagingService,
        DateTimeProvider,
    ],
})
export class CommonModule {}
