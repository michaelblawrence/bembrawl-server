
import { Module } from '@nestjs/common';

import { CommonModule } from './common';
import { PlayersModule } from './players/players.module';
import { HostsModule } from './hosts/hosts.module';
import { EmojiModule } from './games/emoji/emoji.module';
import { GuessFirstModule } from './games/guessfirst/guessfirst.module';

@Module({
    imports: [
        CommonModule,
        EmojiModule,
        GuessFirstModule,
        PlayersModule,
        HostsModule
    ]
})
export class ApplicationModule {}
