
import { Module } from '@nestjs/common';

import { CommonModule } from './common';
import { PassengerModule } from './passenger/passenger.module';
import { PlayersModule } from './players/players.module';

@Module({
    imports: [
        CommonModule,
        PassengerModule,
        PlayersModule
    ]
})
export class ApplicationModule {}
