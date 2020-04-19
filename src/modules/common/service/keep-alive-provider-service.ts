// import { Injectable } from "@nestjs/common";
// import { LoggerService } from "../provider";
// import { DateTimeProvider } from "./date-time-provider";
// import { IKeepAlive } from "../model/IKeepAlive";
// import { HostsServiceConfig } from "../../hosts/service/hosts.service";
// import { IKeepAliveProviderConfig } from "../model/IKeepAliveProviderConfig";

// @Injectable()
// export class KeepAliveProviderService<T extends IKeepAlive> {
//     private periodicHandle: any = null;
//     private getClients: () => Promise<T[]>;
//     private expireClient: (client: T) => Promise<void>;
//     private clientName: string;

//     public constructor(
//         private readonly logger: LoggerService,
//         private readonly dateTimeProviderService: DateTimeProvider
//     ) {}

//     public register(config: IKeepAliveProviderConfig<T>) {
//         this.clientName = config.clientName;
//         this.periodicHandle = setInterval(
//             () => this.onTick(),
//             config.periodicRateMs
//         );
//         this.getClients = config.getClients;
//         this.expireClient = config.expireClient;
//     }

//     public clientKeepAlive(client: T) {
//         client.keepAliveReceived();
//     }

//     public shutdown() {
//         if (this.periodicHandle) {
//             clearInterval(this.periodicHandle);
//         }
//     }

//     private async onTick() {
//         const hosts = await this.getClients();
//         for (const host of hosts) {
//             const msSincePrevKeepAlive = this.dateTimeProviderService.msSince(
//                 host.getLastKeepAliveMs()
//             );
//             if (msSincePrevKeepAlive > HostsServiceConfig.HostTimeoutMs) {
//                 try {
//                     await this.expireClient(host);
//                     this.logger.info(
//                         `${this.clientName} client timed out after ${msSincePrevKeepAlive} ms => sessionId=${host.sessionId}`
//                     );
//                 } catch {
//                     this.logger.error(
//                         this.clientName +
//                             "client failed to timeout host => sessionId=" +
//                             host.sessionId
//                     );
//                 }
//             }
//         }
//     }
// }
