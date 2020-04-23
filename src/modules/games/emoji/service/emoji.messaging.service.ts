import { Injectable } from "@nestjs/common";
import { DateTimeProvider } from "../../../common/service/date-time-provider";
import { GameMessagingService } from "src/modules/common/service/game-messaging.service";
import { GameState } from "src/modules/common/model/GameState";
import {
    MessageTypes,
    EmojiGameStartedMessage,
    EmojiNewPromptMessage,
} from "src/modules/common/model/Message";

@Injectable()
export class EmojiMessagingService {
    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameMessagingService: GameMessagingService
    ) {}

    public async dispatchGameStart(
        game: GameState,
        promptPlayerId: string
    ): Promise<void> {
        const msg: EmojiGameStartedMessage = {
            type: MessageTypes.EMOJI_GAME_STARTED,
            payload: {
                gameStartTimeMs: this.dateTimeProviderService.getTime(),
                initialPromptPlayerId: promptPlayerId,
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }

    public async dispatchNewPrompt(
        game: GameState,
        promptPlayerId: string,
        promptText: string
    ): Promise<void> {
        const msg: EmojiNewPromptMessage = {
            type: MessageTypes.EMOJI_NEW_PROMPT,
            payload: {
                promptText: promptText,
                promptFromPlayerId: promptPlayerId,
            },
        };
        await this.gameMessagingService.dispatchAll(game, msg);
        await this.gameMessagingService.dispatchHost(game, msg);
    }
}
