import { Module } from "@nestjs/common";

import { CommonModule } from "../../common";
import { GuessFirstController } from "./controller/guessfirst.controller";
import { GuessFirstService, GuessFirstGameLogicService } from "./service";
import { GuessFirstGameTimerService, GuessFirstGameTimerProvider } from "./service/guessfirst-game-timer.service";
import { GuessFirstMessagingService } from "./service/guessfirst-messaging.service";

@Module({
    imports: [CommonModule],
    providers: [
        GuessFirstGameTimerProvider,
        GuessFirstGameTimerService,
        GuessFirstMessagingService,
        GuessFirstGameLogicService,
        GuessFirstService,
    ],
    controllers: [GuessFirstController],
    exports: [GuessFirstService],
})
export class GuessFirstModule {}
