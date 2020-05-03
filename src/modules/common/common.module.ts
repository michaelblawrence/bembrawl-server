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
import { AuthTokenService } from "./service/auth-token.service";
@Module({
    providers: [
        AuthTokenService,
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
        AuthTokenService,
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
