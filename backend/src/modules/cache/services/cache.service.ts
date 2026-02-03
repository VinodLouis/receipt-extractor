import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly imageTTL: number;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Default 15 minutes (900 seconds)
    this.imageTTL = this.configService.get('redis.imageTTL') || 900;

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });
  }

  /**
   * Cache receipt image for temporary storage
   * TTL: 15 minutes (configurable)
   */
  async cacheImage(extractionId: string, imageBuffer: Buffer): Promise<void> {
    try {
      const key = this.getImageKey(extractionId);
      const base64Image = imageBuffer.toString('base64');

      await this.redis.setex(key, this.imageTTL, base64Image);

      this.logger.log(
        `Image cached for extraction ${extractionId} (TTL: ${this.imageTTL}s)`,
      );
    } catch (error) {
      this.logger.error(`Failed to cache image: ${error.message}`, error.stack);
      // Don't throw - caching is optional optimization
    }
  }

  /**
   * Retrieve cached image
   */
  async getCachedImage(extractionId: string): Promise<Buffer | null> {
    try {
      const key = this.getImageKey(extractionId);
      const base64Image = await this.redis.get(key);

      if (base64Image) {
        this.logger.log(`Cache hit for extraction ${extractionId}`);
        return Buffer.from(base64Image, 'base64');
      }

      this.logger.log(`Cache miss for extraction ${extractionId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get cached image: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Delete cached image
   */
  async deleteCachedImage(extractionId: string): Promise<void> {
    try {
      const key = this.getImageKey(extractionId);
      await this.redis.del(key);
      this.logger.log(`Cache deleted for extraction ${extractionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete cache: ${error.message}`,
        error.stack,
      );
    }
  }

  private getImageKey(extractionId: string): string {
    return `receipt:${extractionId}`;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
