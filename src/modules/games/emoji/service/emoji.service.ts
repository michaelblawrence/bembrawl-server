import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../../common/provider";

import { GameStateService } from "../../../common/service/game-state.service";
import { DateTimeProvider } from "../../../common/service/date-time-provider";
import { GameRoomService } from "../../../common/service/game-room.service";
import { GameMessagingService } from "src/modules/common/service/game-messaging.service";

export const EmojiServiceConfig = {
    HostTimeoutMs: 20 * 1000,
    PeriodicRateMs: 3 * 1000,
};

@Injectable()
export class EmojiService {
    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameRoomService: GameRoomService,
        private readonly gameMessagingService: GameMessagingService,
        private readonly gameStateService: GameStateService,
        private readonly logger: LoggerService
    ) {}
}
