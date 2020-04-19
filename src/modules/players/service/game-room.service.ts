import { LoggerService } from "../../common/provider";
import { GameStateService } from "./game-state.service";
import { RoomIdStateProvider } from "./room-id-state.provider";
import { GameState } from "../model/GameState";
import { PlayersState } from "../model/PlayersState";
import { Injectable } from "@nestjs/common";

@Injectable()
export class GameRoomService {
    public constructor(
        private readonly gameStateService: GameStateService,
        private readonly roomIdStateProvider: RoomIdStateProvider,
        private readonly logger: LoggerService
    ) {}

    public async newGame(seedPlayer?: PlayersState): Promise<GameState> {
        let joinId: number | null = null;
        try {
            joinId = this.roomIdStateProvider.claimRoomId();
            const game = new GameState(joinId);
            if (seedPlayer) {
                this.addPlayerToGame(seedPlayer, game);
            }
            this.gameStateService.setGame(game);
            return game;
        } catch {
            this.logger.error(
                "could not create new game" +
                    (seedPlayer
                        ? `for player with session id=${seedPlayer.sessionId}`
                        : "")
            );
            if (joinId !== null) {
                this.roomIdStateProvider.releaseRoomId(joinId);
            }
            throw new Error("Could not create game");
        }
    }

    public async joinGame(
        joinId: number,
        player: PlayersState
    ): Promise<boolean> {
        const game = await this.gameStateService.getGameRoom(joinId);
        if (!game) {
            return false;
        }
        this.logger.info(
            `player ${player.sessionId} joining active game id=${game.guid}`
        );
        this.addPlayerToGame(player, game);
        this.gameStateService.updateGame(game);
        return true;
    }

    public async leaveGame(player: PlayersState): Promise<boolean> {
        const gameGuid = player.getGameGuid();
        const game = await this.gameStateService.getGame(gameGuid);
        if (!game) {
            return false;
        }
        const removePlayerSuccess = game.removePlayer(player);
        if (!removePlayerSuccess) {
            this.logger.error(
                `can not remove player id=${player.sessionId} as is not assigned to room id=${game.guid}`
            );
        }
        if (game.hasAnyPlayers()) {
            this.gameStateService.updateGame(game);
            this.logger.info(
                `removed player from game id=${game.guid} roomId=${game.joinId}.`
            );
        } else {
            this.gameStateService.removeGame(game);
            this.logger.info(
                `removed game id=${game.guid} roomId=${game.joinId}. All players left.`
            );
        }
        return true;
    }

    private addPlayerToGame(player: PlayersState, game: GameState) {
        player.assignGame(game.guid);

        const gameAddSuccess = game.addPlayers(player);
        if (!gameAddSuccess) {
            this.logger.info("added no players on game id=" + game.guid);
        }
    }
}
