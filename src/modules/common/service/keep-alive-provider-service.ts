import { Injectable } from "@nestjs/common";
import { LoggerService } from "../provider";
import { DateTimeProvider } from "./date-time-provider";
import { IKeepAlive } from "../model/IKeepAlive";
import { IKeepAliveProviderConfig } from "../model/IKeepAliveProviderConfig";

@Injectable()
export class KeepAliveProviderService<T extends IKeepAlive> {
    private periodicHandle: any = null;
    private getClients: () => Promise<T[]>;
    private expireClient: (client: T) => Promise<void>;
    private clientName: string;
    private hostTimeoutMs: number;

    public constructor(
        private readonly logger: LoggerService,
        private readonly dateTimeProviderService: DateTimeProvider
    ) {}

    public register(config: IKeepAliveProviderConfig<T>) {
        this.clientName = config.clientName;
        this.periodicHandle = setInterval(
            () => this.onTick(),
            config.periodicRateMs
        );
        this.hostTimeoutMs = config.hostTimeoutMs;
        this.getClients = config.getClients;
        this.expireClient = config.expireClient;
    }

    public clientKeepAlive(client: T) {
        client.keepAliveReceived();
    }

    public shutdown() {
        if (this.periodicHandle) {
            clearInterval(this.periodicHandle);
        }
    }

    private async onTick() {
        const clients = await this.getClients();
        for (const client of clients) {
            await this.checkClientTimeout(client);
        }
    }

    private async checkClientTimeout(client: T | null) {
        if (!client) return;

        const lastPing = client.getLastKeepAliveMs();
        const msSincePing = this.dateTimeProviderService.msSince(lastPing);
        if (msSincePing <= this.hostTimeoutMs) {
            return;
        }

        try {
            await this.expireClient(client);
            this.logger.info(
                `${this.clientName} client timed out after ${msSincePing} ms => sessionId=${client.sessionId}`
            );
        } catch {
            this.logger.error(
                `${this.clientName} client failed to timeout sessionId=${client.sessionId}`
            );
        }
    }
}
