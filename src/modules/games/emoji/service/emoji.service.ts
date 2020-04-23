import { Injectable } from "@nestjs/common";
import { LoggerService } from "../../../common/provider";

import { GameStateService } from "../../../common/service/game-state.service";
import { DateTimeProvider } from "../../../common/service/date-time-provider";
import { GameRoomService } from "../../../common/service/game-room.service";
import { GameState } from "src/modules/common/model/GameState";
import { EmojiGameTimerService } from "./emoji-game-timer.service";
import { PlayersState } from "src/modules/common/model/PlayersState";
import { EmojiMessagingService } from "./emoji.messaging.service";

export const EmojiServiceConfig = {};

class EmojiUtils {
    public static randomEntry<T>(entries: T[]): T {
        return entries[EmojiUtils.randomInt(entries.length)];
    }
    public static randomInt(
        maxExclusive: number,
        minInclusive: number = 0
    ): number {
        const randomRange = Math.random() * (maxExclusive - minInclusive);
        const adjusted = Math.floor(randomRange + minInclusive);
        return Math.min(adjusted, maxExclusive - 1);
    }
}
@Injectable()
export class EmojiService {
    public constructor(
        private readonly dateTimeProviderService: DateTimeProvider,
        private readonly gameRoomService: GameRoomService,
        private readonly emojiMessagingService: EmojiMessagingService,
        private readonly emojiGameTimerService: EmojiGameTimerService,
        private readonly gameStateService: GameStateService,
        private readonly logger: LoggerService
    ) {}

    public register(game: GameState) {
        if (!game.closed) {
            this.logger.info(`game room ${game.guid} is not yet closed/ready`);
        }
        this.start(game);
    }

    private async start(game: GameState) {
        const players = Object.entries(game.players);
        while (game.hasAnyPlayers()) {
            await this.gameLoop(players, game);
        }
    }

    private async gameLoop(players: [string, PlayersState][], game: GameState) {
        const [startingPlayerId] = EmojiUtils.randomEntry(players);

        await this.emojiMessagingService.dispatchGameStart(
            game,
            startingPlayerId
        );
        const playerPrompt = await this.emojiGameTimerService.queuePlayerPrompt(
            game,
            startingPlayerId
        );

        const { promptText } = playerPrompt.result.payload;
        if (playerPrompt.timeoutExpired || !promptText) {
            this.logger.info("round expired on player prompt");
            return;
        }
        await this.emojiMessagingService.dispatchNewPrompt(
            game,
            startingPlayerId,
            promptText
        );
        const playerResponses = await this.emojiGameTimerService.queuePlayerResponses(
            game
            );
            const {responses} = playerResponses.result.payload
            if (playerPrompt.timeoutExpired || responses.length === 0) {
                this.logger.info("round expired on player responses");
                return;
            }
        // const players.map(([_, player]) => player.deviceId);
    }
}
