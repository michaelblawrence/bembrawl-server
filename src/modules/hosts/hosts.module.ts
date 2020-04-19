import { Module } from "@nestjs/common";

import { CommonModule } from "../common";
import { HostsController } from "./controller/hosts.controller";
import {
    HostsService
} from "./service";

@Module({
    imports: [CommonModule],
    providers: [
        HostsService
    ],
    controllers: [HostsController],
    exports: [],
})
export class HostsModule {}
