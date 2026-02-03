import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/services/prisma.service';
import { ExtractionStatus } from '../../src/generated/client/client';
import * as path from 'path';

const imagePath = path.join(__dirname, 'fixtures', '1.jpg');
const imagePathIncorrect = path.join(__dirname, 'fixtures', '1.txt');
const imagePathLarge = path.join(__dirname, 'fixtures', '25mb.jpg');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

jest.setTimeout(10 * 60 * 1000); // 10 minutes

describe('Extraction E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.extraction.deleteMany();
  });

  describe('Complete Extraction Flow', () => {
    it('should handle complete extraction lifecycle', async () => {
      // 1. Upload receipt
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/extractions')
        .set('Authorization', 'Bearer test-user-e2e')
        .field('userId', 'test-user-e2e')
        .attach('file', imagePath)
        .expect(201);

      expect(uploadResponse.body).toHaveProperty('id');
      expect(uploadResponse.body.status).toBe('EXTRACTING');

      const extractionId = uploadResponse.body.id;

      // 2. Verify initial state in database (SUBMITTING)
      let extraction = await prisma.extraction.findUnique({
        where: { id: extractionId },
      });
      //console.log('Extraction after upload1:', extraction);

      expect(extraction).toBeDefined();
      expect(extraction.id).toBe(extractionId);
      expect(extraction.userId).toBe('test-user-e2e');
      expect(extraction.filename).toBe('1.jpg');
      expect(extraction.imageUrl).toContain('s3.eu-north-1.amazonaws.com');
      expect(extraction.status).toBe(ExtractionStatus.SUBMITTING);
      expect(extraction.date).toBeNull();
      expect(extraction.currency).toBeNull();
      expect(extraction.vendorName).toBeNull();
      expect(extraction.items).toBeNull();
      expect(extraction.tax).toBeNull();
      expect(extraction.total).toBeNull();
      expect(extraction.failureReason).toBeNull();
      expect(extraction.createdAt).toBeDefined();
      expect(extraction.updatedAt).toBeDefined();

      await sleep(1000 * 10);

      // 3. Verify transition to EXTRACTING state
      extraction = await prisma.extraction.findUnique({
        where: { id: extractionId },
      });
      //console.log('Extraction after upload2:', extraction);

      expect(extraction).toBeDefined();
      expect(extraction.id).toBe(extractionId);
      expect(extraction.userId).toBe('test-user-e2e');
      expect(extraction.filename).toBe('1.jpg');
      expect(extraction.status).toBe(ExtractionStatus.EXTRACTING);
      expect(extraction.date).toBeNull();
      expect(extraction.currency).toBeNull();
      expect(extraction.vendorName).toBeNull();
      expect(extraction.items).toBeNull();
      expect(extraction.tax).toBeNull();
      expect(extraction.total).toBeNull();
      expect(extraction.failureReason).toBeNull();
      expect(extraction.updatedAt.getTime()).toBeGreaterThan(
        extraction.createdAt.getTime(),
      );

      await sleep(1000 * 60 * 5);

      // 4. Get extraction by ID and verify EXTRACTED state
      const getResponse = await request(app.getHttpServer())
        .get(`/api/extractions/${extractionId}`)
        .set('Authorization', 'Bearer test-user-e2e')
        .expect(200);
      //console.log('get the extraction:', getResponse.body);

      expect(getResponse.body.id).toBe(extractionId);
      expect(getResponse.body.filename).toBe('1.jpg');
      expect(getResponse.body.status).toBe('EXTRACTED');
      expect(getResponse.body.date).toBe('2021-03-26T00:00:00.000Z');
      expect(getResponse.body.currency).toBe('USD');
      expect(getResponse.body.vendorName).toBe('STOP&SHOP');
      expect(getResponse.body.items).toHaveLength(5);
      expect(getResponse.body.items[0]).toEqual({
        qty: 3,
        cost: 2.99,
        name: 'SB BGICE CB 10LB',
      });
      expect(getResponse.body.items[1]).toEqual({
        qty: 1,
        cost: 2,
        name: 'HALLMARK CARD',
      });
      expect(getResponse.body.items[2]).toEqual({
        qty: 1,
        cost: 3.79,
        name: 'HALLMARK CARD',
      });
      expect(getResponse.body.items[3]).toEqual({
        qty: 1,
        cost: 0.99,
        name: 'HALLMARK CARD',
      });
      expect(getResponse.body.items[4]).toEqual({
        qty: 1,
        cost: 1,
        name: 'CHARITY',
      });
      expect(getResponse.body.tax).toBe('0.42');
      expect(getResponse.body.total).toBe('17.17');
      expect(getResponse.body.failureReason).toBeNull();

      // 5. List user extractions
      const listResponse = await request(app.getHttpServer())
        .get('/api/extractions')
        .set('Authorization', 'Bearer test-user-e2e')
        .query({ userId: 'test-user-e2e' })
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].id).toBe(extractionId);
      expect(listResponse.body[0].status).toBe('EXTRACTED');
      expect(listResponse.body[0].vendorName).toBe('STOP&SHOP');
      expect(listResponse.body[0].total).toBe('17.17');

      // 6. Verify final state in database
      extraction = await prisma.extraction.findUnique({
        where: { id: extractionId },
      });
      //console.log('Extraction after extraction:', extraction);

      expect(extraction).toBeDefined();
      expect(extraction.id).toBe(extractionId);
      expect(extraction.userId).toBe('test-user-e2e');
      expect(extraction.filename).toBe('1.jpg');
      expect(extraction.status).toBe(ExtractionStatus.EXTRACTED);
      expect(extraction.date).toEqual(new Date('2021-03-26T00:00:00.000Z'));
      expect(extraction.currency).toBe('USD');
      expect(extraction.vendorName).toBe('STOP&SHOP');
      expect(extraction.items).toHaveLength(5);
      expect(extraction.items[0]).toEqual({
        qty: 3,
        cost: 2.99,
        name: 'SB BGICE CB 10LB',
      });
      expect(parseFloat(extraction.tax as any)).toEqual(0.42);
      expect(parseFloat(extraction.total as any)).toEqual(17.17);
      expect(extraction.failureReason).toBeNull();
      expect(extraction.createdAt).toBeDefined();
      expect(extraction.updatedAt).toBeDefined();
      expect(extraction.updatedAt.getTime()).toBeGreaterThan(
        extraction.createdAt.getTime(),
      );

      // 7. Delete extraction
      await request(app.getHttpServer())
        .delete(`/api/extractions/${extractionId}`)
        .set('Authorization', 'Bearer test-user-e2e')
        .expect(200);

      // 8. Verify deletion
      const deletedExtraction = await prisma.extraction.findUnique({
        where: { id: extractionId },
      });

      expect(deletedExtraction).toBeNull();
    });

    it('should reject invalid file types', async () => {
      await request(app.getHttpServer())
        .post('/api/extractions')
        .set('Authorization', 'Bearer test-user-e2e')
        .field('userId', 'test-user')
        .attach('file', imagePathIncorrect)
        .expect(400);
    });
  });

  describe('Validation Tests', () => {
    it('should require userId', async () => {
      await request(app.getHttpServer())
        .post('/api/extractions')
        .attach('file', imagePath)
        .expect(401);
    });

    it('should require file', async () => {
      await request(app.getHttpServer())
        .post('/api/extractions')
        .set('Authorization', 'Bearer test-user-e2e')
        .field('userId', 'test-user')
        .expect(400);
    });

    it('should validate file size (mock)', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await request(app.getHttpServer())
        .post('/api/extractions')
        .set('Authorization', 'Bearer test-user-e2e')
        .field('userId', 'test-user')
        .attach('file', imagePathLarge)
        .expect(413);
    });
  });
});
