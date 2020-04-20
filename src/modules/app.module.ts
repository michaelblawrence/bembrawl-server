
import { Module } from '@nestjs/common';

import { CommonModule } from './common';
import { PlayersModule } from './players/players.module';
import { HostsModule } from './hosts/hosts.module';

@Module({
    imports: [
        CommonModule,
        PlayersModule,
        HostsModule
    ]
})
export class ApplicationModule {}
