import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExtractionService } from '../../../../../src/modules/extraction/services/extraction.service';
import { PrismaService } from '../../../../../src/modules/prisma/services/prisma.service';
import { StorageService } from '../../../../../src/modules/storage/services/storage.service';
import { CacheService } from '../../../../../src/modules/cache/services/cache.service';
import { getQueueToken } from '@nestjs/bull';
import { WebsocketGateway } from '../../../../../src/modules/websocket/websocket.gateway';

describe('ExtractionService', () => {
  let service: ExtractionService;
  let mockPrisma: any;
  let mockQueue: any;
  let mockStorage: any;
  let mockCache: any;

  beforeEach(async () => {
    mockPrisma = {
      extraction: {
        create: jest.fn().mockImplementation(({ data }) => data),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: '123',
          ...data,
        })),
        delete: jest.fn(),
      },
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getActive: jest.fn().mockResolvedValue([]),
      getWaiting: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
    };

    mockStorage = {
      uploadFile: jest.fn().mockResolvedValue({
        imageUrl: 'https://s3/receipt.jpg',
        id: 'extraction-123',
      }),
      deleteFile: jest.fn(),
    };

    mockCache = {
      cacheImage: jest.fn(),
      deleteCachedImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('extraction'), useValue: mockQueue },
        { provide: StorageService, useValue: mockStorage },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createExtraction', () => {
    it('should create extraction successfully', async () => {
      const file = {
        originalname: 'receipt.jpg',
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const userId = 'user-123';

      const result = await service.createExtraction(file, userId);

      // wait
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockStorage.uploadFile).toHaveBeenCalledWith(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
      );
      expect(mockPrisma.extraction.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result.status).toBe('EXTRACTING');
    });

    it('should throw BadRequestException if no file', async () => {
      await expect(
        service.createExtraction(null as any, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if upload fails', async () => {
      const file = {
        originalname: 'test.jpg',
        buffer: Buffer.from('x'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      mockStorage.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(service.createExtraction(file, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateExtraction', () => {
    it('should update extraction with provided data', async () => {
      const updates = { status: 'invalid' };
      const result = await service.updateExtraction('123', updates);
      expect(result.status).toBe('invalid');
    });

    it('should update extraction status to extracting', async () => {
      const updates = { status: 'extracting' };
      const result = await service.updateExtraction('123', updates);
      expect(result.status).toBe('extracting');
    });
  });

  describe('deleteExtraction', () => {
    it('should delete extraction and related resources', async () => {
      mockPrisma.extraction.findUnique.mockResolvedValue({
        id: '123',
        filename: 'receipt.jpg',
      });

      await service.deleteExtraction('123', 'user-123');

      expect(mockStorage.deleteFile).toHaveBeenCalledWith(
        '123',
        'receipt.jpg',
        'user-123',
      );
      expect(mockCache.deleteCachedImage).toHaveBeenCalledWith('123');
      expect(mockPrisma.extraction.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should do nothing if extraction not found', async () => {
      mockPrisma.extraction.findUnique.mockResolvedValue(null);

      await service.deleteExtraction('999', 'user-123');

      expect(mockStorage.deleteFile).not.toHaveBeenCalled();
      expect(mockCache.deleteCachedImage).not.toHaveBeenCalled();
      expect(mockPrisma.extraction.delete).not.toHaveBeenCalled();
    });
  });
});
