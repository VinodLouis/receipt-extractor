import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { PrismaService } from '../../prisma/services/prisma.service';
import { ExtractionStatus } from '../../../generated/client/client';
import { StorageService } from '../../storage/services/storage.service';
import { CacheService } from '../../cache/services/cache.service';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private selectProjections: any;

  constructor(
    private prisma: PrismaService,
    @InjectQueue('extraction')
    private extractionQueue: Queue,
    private storageService: StorageService,
    private cacheService: CacheService,
  ) {
    this.selectProjections = {
      id: true,
      filename: true,
      imageUrl: true,
      status: true,
      date: true,
      currency: true,
      vendorName: true,
      items: true,
      tax: true,
      total: true,
      failureReason: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  async createExtraction(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    this.logger.log(`Creating extraction for : ${file.originalname}`);

    try {
      // Upload image to S3
      const { imageUrl, id } = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
      );

      // Create extraction record
      const extraction = await this.prisma.extraction.create({
        data: {
          id,
          userId,
          filename: file.originalname,
          imageUrl,
          status: ExtractionStatus.SUBMITTING,
        },
      });

      // Fire async processing
      this.processExtractionAsync(
        extraction.id,
        file.originalname,
        file.buffer,
        userId,
      ).catch((error) => {
        this.logger.error(
          `Failed to process extraction ${extraction.id}: ${error.message}`,
          error.stack,
        );
      });

      return {
        id,
        imageUrl,
        filename: file.originalname,
        status: ExtractionStatus.EXTRACTING,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create extraction: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(error.message);
    }
  }

  private async processExtractionAsync(
    extractionId: string,
    filename: string,
    fileBuffer: Buffer,
    userId: string,
  ) {
    // Cache image in Redis
    await this.cacheService.cacheImage(extractionId, fileBuffer);

    // Update status to extracting
    await this.prisma.extraction.update({
      where: { id: extractionId },
      data: { status: ExtractionStatus.EXTRACTING },
    });

    // Queue extraction job
    await this.extractionQueue.add(
      'process-receipt',
      {
        extractionId,
        filename,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Extraction ${extractionId} queued successfully`);
  }

  async getExtractionsByUser(userId: string) {
    const extractions = await this.prisma.extraction.findMany({
      where: { userId },
      select: this.selectProjections,
      orderBy: { createdAt: 'desc' },
    });

    if (extractions.length === 0) {
      return [];
    }

    const extractionsWithSignedImage = await Promise.all(
      extractions.map(async (extraction) => {
        const imageUrl = await this.storageService.generateSignedUrl(
          extraction.id,
          extraction.filename,
          userId,
        );
        return { ...extraction, imageUrl };
      }),
    );
    return extractionsWithSignedImage;
  }

  async getExtractionById(id: string, userId: string) {
    const extraction = await this.prisma.extraction.findUnique({
      where: { id, userId },
      select: this.selectProjections,
    });

    return extraction ? extraction : null;
  }

  async updateExtraction(id: string, updates: any) {
    const extraction = await this.prisma.extraction.update({
      where: { id },
      data: updates,
      select: this.selectProjections,
    });

    return extraction;
  }

  async deleteExtraction(id: string, userId: string) {
    const extraction = await this.prisma.extraction.findUnique({
      where: { id, userId },
    });

    if (extraction) {
      // Remove from Queue
      const job = await this.findJobByExtractionId(extraction.id);

      if (job) {
        try {
          // Try to mark as failed (works only if active)
          await job.moveToFailed(new Error('Cancelled by user'), true);
          this.logger.log(`Job ${job.id} marked as failed`);
        } catch (err) {
          this.logger.warn(
            `Job ${job.id} not active, removing instead: ${err.message}`,
          );
          // If not active, remove from queue
          await job.remove();
          this.logger.log(`Job ${job.id} removed from queue`);
        }
      }

      // Delete from S3
      await this.storageService.deleteFile(
        extraction.id,
        extraction.filename,
        userId,
      );

      // Delete from cache
      await this.cacheService.deleteCachedImage(extraction.id);

      // Delete from database
      await this.prisma.extraction.delete({
        where: { id },
      });

      this.logger.log(`Extraction ${id} deleted successfully`);
    }
  }

  async findJobByExtractionId(extractionId: string): Promise<Job | undefined> {
    // Check active jobs
    const activeJobs = await this.extractionQueue.getActive();
    let job = activeJobs.find((j) => j.data.extractionId === extractionId);

    if (!job) {
      // Check waiting jobs
      const waitingJobs = await this.extractionQueue.getWaiting();
      job = waitingJobs.find((j) => j.data.extractionId === extractionId);
    }

    if (!job) {
      // Check delayed jobs
      const delayedJobs = await this.extractionQueue.getDelayed();
      job = delayedJobs.find((j) => j.data.extractionId === extractionId);
    }

    if (!job) {
      // Optionally check failed jobs
      const failedJobs = await this.extractionQueue.getFailed();
      job = failedJobs.find((j) => j.data.extractionId === extractionId);
    }

    return job;
  }
}
