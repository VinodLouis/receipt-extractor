import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { ExtractionController } from './controllers/extraction.controller';
import { ExtractionService } from './services/extraction.service';
import { OllamaService } from './services/ollama.service';
import { ExtractionProcessor } from './processors/extraction.processor';
import { StorageModule } from '../storage/storage.module';
import { CacheModule } from '../cache/cache.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'extraction',
    }),
    BullBoardModule.forFeature({
      name: 'extraction',
      adapter: BullAdapter, // Use BullAdapter for Bull v4
    }),
    MulterModule.register({}),
    StorageModule,
    CacheModule,
    WebsocketModule,
  ],
  controllers: [ExtractionController],
  providers: [ExtractionService, OllamaService, ExtractionProcessor],
  exports: [ExtractionService, OllamaService],
})
export class ExtractionModule {}
