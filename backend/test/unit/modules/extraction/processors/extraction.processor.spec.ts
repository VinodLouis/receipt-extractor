import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { ExtractionProcessor } from '../../../../../src/modules/extraction/processors/extraction.processor';
import { ExtractionService } from '../../../../../src/modules/extraction/services/extraction.service';
import { OllamaService } from '../../../../../src/modules/extraction/services/ollama.service';
import { CacheService } from '../../../../../src/modules/cache/services/cache.service';
import { StorageService } from '../../../../../src/modules/storage/services/storage.service';
import { ExtractionStatus } from '../../../../../src/generated/client/client';
import { WebsocketGateway } from '../../../../../src/modules/websocket/websocket.gateway';

describe('ExtractionProcessor', () => {
  let processor: ExtractionProcessor;
  let mockExtractionService: any;
  let mockOllamaService: any;
  let mockCacheService: any;
  let mockStorageService: any;
  let mockWebsocketGateway: any;

  beforeEach(async () => {
    mockExtractionService = {
      updateExtraction: jest.fn(),
    };

    mockOllamaService = {
      extractReceiptData: jest.fn(),
    };

    mockCacheService = {
      getCachedImage: jest.fn(),
      cacheImage: jest.fn(),
      deleteCachedImage: jest.fn(),
    };

    mockStorageService = {
      downloadFile: jest.fn(),
    };

    mockWebsocketGateway = {
      emitExtractionUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionProcessor,
        { provide: ExtractionService, useValue: mockExtractionService },
        { provide: OllamaService, useValue: mockOllamaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: WebsocketGateway, useValue: mockWebsocketGateway },
      ],
    }).compile();

    processor = module.get<ExtractionProcessor>(ExtractionProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const job: Job = {
    id: 'job-123',
    data: { extractionId: 'ext-123', filename: 'receipt.jpg' },
  } as any;

  describe('handleExtractionJob', () => {
    it('should process extraction successfully', async () => {
      const fakeBuffer = Buffer.from('image-data');
      mockCacheService.getCachedImage.mockResolvedValue(fakeBuffer);
      mockOllamaService.extractReceiptData.mockResolvedValue({
        message: {
          content: JSON.stringify({
            is_valid: true,
            done_reason: 'success',
            date: '2026-01-15',
            currency: 'SGD',
            vendorName: 'Test Vendor',
            items: [{ name: 'Item1', cost: 10 }],
            tax: 1.5,
            total: 11.5,
          }),
        },
      });

      await processor.handleExtractionJob(job);

      expect(mockCacheService.getCachedImage).toHaveBeenCalledWith('ext-123');
      expect(mockOllamaService.extractReceiptData).toHaveBeenCalled();
      expect(mockExtractionService.updateExtraction).toHaveBeenCalledWith(
        'ext-123',
        expect.objectContaining({ status: ExtractionStatus.EXTRACTED }),
      );
    });

    it('should mark extraction invalid if result is not valid', async () => {
      const fakeBuffer = Buffer.from('image-data');
      mockCacheService.getCachedImage.mockResolvedValue(fakeBuffer);
      mockOllamaService.extractReceiptData.mockResolvedValue({
        message: {
          content: JSON.stringify({
            is_valid: false,
            done_reason: 'bad_input',
          }),
        },
      });

      await processor.handleExtractionJob(job);

      expect(mockExtractionService.updateExtraction).toHaveBeenCalledWith(
        'ext-123',
        expect.objectContaining({ status: ExtractionStatus.INVALID }),
      );
      expect(mockCacheService.deleteCachedImage).toHaveBeenCalledWith(
        'ext-123',
      );
    });

    it('should handle validation errors', async () => {
      const fakeBuffer = Buffer.from('image-data');
      mockCacheService.getCachedImage.mockResolvedValue(fakeBuffer);
      mockOllamaService.extractReceiptData.mockResolvedValue({
        message: {
          content: JSON.stringify({
            is_valid: true,
            done_reason: 'success',
            date: '',
            currency: 'SGD',
            vendorName: 'Test Vendor',
            items: [],
            tax: 0,
            total: 0,
          }),
        },
      });

      await expect(processor.handleExtractionJob(job)).rejects.toThrow();

      expect(mockExtractionService.updateExtraction).toHaveBeenCalledWith(
        'ext-123',
        expect.objectContaining({ status: ExtractionStatus.FAILED }),
      );
      expect(mockCacheService.deleteCachedImage).toHaveBeenCalledWith(
        'ext-123',
      );
    });

    it('should handle unexpected errors', async () => {
      mockCacheService.getCachedImage.mockRejectedValue(
        new Error('Redis down'),
      );

      await expect(processor.handleExtractionJob(job)).rejects.toThrow();

      expect(mockExtractionService.updateExtraction).toHaveBeenCalledWith(
        'ext-123',
        expect.objectContaining({ status: ExtractionStatus.FAILED }),
      );
      expect(mockCacheService.deleteCachedImage).toHaveBeenCalledWith(
        'ext-123',
      );
    });
  });

  describe('onCompleted', () => {
    it('should log job completion', async () => {
      const spy = jest.spyOn(processor['logger'], 'log');
      await processor.onCompleted(job);
      expect(spy).toHaveBeenCalledWith(`Job ${job.id} completed`);
    });
  });

  describe('onFailed', () => {
    it('should log job failure', async () => {
      const spy = jest.spyOn(processor['logger'], 'error');
      await processor.onFailed(job, new Error('Test failure'));
      expect(spy).toHaveBeenCalledWith(
        `Job ${job.id} failed after ${job.attemptsMade} attempts: Test failure`,
      );
    });
  });
});
