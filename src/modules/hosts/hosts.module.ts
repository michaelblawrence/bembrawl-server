import { Module } from "@nestjs/common";

import { CommonModule } from "../common";
import { HostsController } from "./controller/hosts.controller";
import {
    HostsService
} from "./service";
import { HostsKeepAliveService } from "./service/hosts.service";

@Module({
    imports: [CommonModule],
    providers: [
        HostsService,
        HostsKeepAliveService
    ],
    controllers: [HostsController],
    exports: [],
})
export class HostsModule {}
