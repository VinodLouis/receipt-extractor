import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ExtractionModule } from './modules/extraction/extraction.module';
import { StorageModule } from './modules/storage/storage.module';
import { CacheModule } from './modules/cache/cache.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import configuration from './config/configuration';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/auth.guard';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { BullBoardConfigModule } from './bull-board.module';
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Prisma (PostgreSQL)
    PrismaModule,

    // Redis/BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    ExtractionModule,
    StorageModule,
    CacheModule,
    WebsocketModule,

    // Bull Board
    BullBoardConfigModule,
  ],
})
export class AppModule {}
