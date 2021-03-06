import { IKeepAlive } from "./IKeepAlive";

export interface IKeepAliveProviderConfig<T extends IKeepAlive> {
    clientName: string;
    periodicRateMs: number;
    hostTimeoutMs: number;
    getClients: () => Promise<T[]>;
    expireClient: (client: T) => Promise<void>;
}
