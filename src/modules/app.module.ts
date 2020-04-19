
import { Module } from '@nestjs/common';

import { CommonModule } from './common';
import { PassengerModule } from './passenger/passenger.module';
import { PlayersModule } from './players/players.module';
import { HostsModule } from './hosts/hosts.module';

@Module({
    imports: [
        CommonModule,
        PassengerModule,
        PlayersModule,
        HostsModule
    ]
})
export class ApplicationModule {}
