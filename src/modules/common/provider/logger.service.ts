import * as winston from "winston";
import { PlayersState } from "../model/PlayersState";
import { GameState } from "../model/GameState";
import 'winston-daily-rotate-file';

export class LoggerService {
    private readonly instance: winston.Logger;

    public constructor() {
        const format = this.isProductionEnv()
            ? winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.json()
              )
            : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
                  winston.format.printf((info) => `${info.timestamp} ${info.level} ${info.message}`)
              );

        this.instance = winston.createLogger({
            level: "info",
            silent: this.isTestEnv(),
            format,
            transports: [
                new winston.transports.Console({
                    stderrLevels: ["error"],
                }),
                new winston.transports.DailyRotateFile({
                    filename: "bembrawl.%DATE%.info.log",
                    datePattern: 'YYYYMMDD',
                    handleExceptions: true,
                    zippedArchive: true
                }),
            ],
        });
    }

    public info(
        message: string,
        player: PlayersState | null = null,
        game: GameState | null = null
    ) {
        const prefix = this.gameLogInfo(game) + this.playerLogInfo(player);
        this.instance.info(prefix + message);
    }

    public error(
        message: string,
        player: PlayersState | null = null,
        game: GameState | null = null
    ) {
        const prefix = this.gameLogInfo(game) + this.playerLogInfo(player);
        this.instance.error(prefix + message);
    }

    private isTestEnv(): boolean {
        return process.env.NODE_ENV === "test";
    }

    private isProductionEnv(): boolean {
        return (
            process.env.NODE_ENV === "production" ||
            process.env.NODE_ENV === "staging"
        );
    }

    private playerLogInfo(player: PlayersState | null): string {
        if (!player) return "";
        try {
            const pingedMsAgo = Date.now() - player.getLastKeepAliveMs();
            return `[(P) ${player.sessionId} idx=${player.getJoinOrder()} ms=${pingedMsAgo}] `;
        } catch (ex) {
            this.instance.error("{P-INFO-ERROR}: " + ex);
            return `[(P) {P-INFO-ERROR}] `;
        }
    }

    private gameLogInfo(game: GameState | null): string {
        if (!game) return "";
        try {
            const hostsCount = Object.keys(game.hosts).length;
            const playersCount = Object.keys(game.players).length;
            const closedYn = game.closed() ? "Y" : "N";
            return `[(G) ${game.guid} room=${game.joinId} H=${hostsCount},P=${playersCount},C=${closedYn}] `;
        } catch (ex) {
            this.instance.error("{G-INFO-ERROR}: " + ex);
            return `[(G) {G-INFO-ERROR}] `;
        }
    }
}
