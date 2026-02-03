import {
  Process,
  Processor,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ExtractionService } from '../services/extraction.service';
import { OllamaService } from '../services/ollama.service';
import { CacheService } from '../../cache/services/cache.service';
import { StorageService } from '../../storage/services/storage.service';
import { ExtractionStatus } from '../../../generated/client/client';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ExtractionResultDto } from '../dto/extraction-result.dto';
import { QwenReceiptParser } from '../../../utils/receipt.parses';
import { QwenResponse, ReceiptData } from 'src/utils/types';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

@Processor('extraction')
export class ExtractionProcessor {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    private extractionService: ExtractionService,
    private ollamaService: OllamaService,
    private cacheService: CacheService,
    private storageService: StorageService,
    private websocketGateway: WebsocketGateway,
  ) {}

  @Process('process-receipt')
  async handleExtractionJob(job: Job) {
    const { extractionId, filename, userId } = job.data;

    this.logger.log(
      `Processing extraction ${extractionId} (Job ID: ${job.id})`,
    );
    const startTime = Date.now();

    try {
      // 1. Try to get image from Redis cache first
      let imageBuffer = await this.cacheService.getCachedImage(extractionId);

      if (!imageBuffer) {
        this.logger.log(`Cache miss - downloading from S3 for ${extractionId}`);

        // Download from S3
        imageBuffer = await this.storageService.downloadFile(
          extractionId,
          filename,
          userId,
        );

        // Cache for future retries
        await this.cacheService.cacheImage(extractionId, imageBuffer);
      } else {
        this.logger.log(`Cache hit for ${extractionId}`);
      }

      // 2. Convert to base64 for Ollama
      const imageBase64 = imageBuffer.toString('base64');

      // 3. Call Ollama for extraction
      const rawResult: QwenResponse =
        await this.ollamaService.extractReceiptData(imageBase64);

      // 4. Parse Ollama response
      const result: ReceiptData =
        QwenReceiptParser.parseReceiptResponse(rawResult);

      // 5. Handle invalid receipts
      if (!result.is_valid) {
        const extraction = await this.extractionService.updateExtraction(
          extractionId,
          {
            status: ExtractionStatus.INVALID,
            failureReason: result.error || 'Receipt marked as invalid',
          },
        );
        this.websocketGateway.emitExtractionUpdate(userId, extraction);

        this.logger.log(`Extraction ${extractionId} marked as invalid`);
        await this.cacheService.deleteCachedImage(extractionId);
        return;
      }

      // 6. Validate extracted data
      const extractionDto = plainToClass(ExtractionResultDto, result);
      const errors = await validate(extractionDto);

      if (errors.length > 0) {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints || {}).join(', '))
          .join('; ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      // 7. Update database with extracted data
      const extraction = await this.extractionService.updateExtraction(
        extractionId,
        {
          status: ExtractionStatus.EXTRACTED,
          date: new Date(extractionDto.date),
          currency: extractionDto.currency,
          vendorName: extractionDto.vendorName,
          items: extractionDto.items,
          tax: extractionDto.tax,
          total: extractionDto.total,
        },
      );
      this.websocketGateway.emitExtractionUpdate(userId, extraction);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Extraction ${extractionId} completed in ${processingTime}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Extraction ${extractionId} failed: ${error.message}`,
        error.stack,
      );

      // Update database with failure
      const extraction = await this.extractionService.updateExtraction(
        extractionId,
        {
          status: ExtractionStatus.FAILED,
          failureReason: error.message || 'Unknown error occurred',
        },
      );
      this.websocketGateway.emitExtractionUpdate(userId, extraction);

      // Clean up cache
      await this.cacheService.deleteCachedImage(extractionId);

      // Re-throw to mark job as failed (will trigger retry)
      throw error;
    }
  }

  // Optional: Handle job completion events
  @OnQueueCompleted()
  async onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  // Optional: Handle job failure events
  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
