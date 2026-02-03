import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('aws.region');
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('aws.accessKeyId'),
        secretAccessKey: this.configService.get('aws.secretAccessKey'),
      },
    });

    this.bucketName = this.configService.get('aws.s3BucketName');
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    userId: string,
  ): Promise<{ imageUrl: string; id: string }> {
    const uuid = uuidv4();

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: this.getKey(uuid, filename, userId),
          Body: buffer,
          ContentType: mimetype,
        }),
      );

      this.logger.log(`File uploaded successfully: ${filename}`);
      const imageUrl = await this.generateSignedUrl(uuid, filename, userId);
      return { imageUrl, id: uuid };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw error;
    }
  }

  async downloadFile(
    extractionID: string,
    filename: string,
    userId: string,
  ): Promise<Buffer> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: this.getKey(extractionID, filename, userId),
        }),
      );

      // Convert stream to buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      this.logger.log(`File downloaded successfully: (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      this.logger.error(
        `Failed to download file: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteFile(
    extractionID: string,
    filename: string,
    userId: string,
  ): Promise<void> {
    try {
      const key = this.getKey(extractionID, filename, userId);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.log(`File deleted successfully: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      // Don't throw - deletion failures shouldn't block other operations
    }
  }

  async generateSignedUrl(
    id: string,
    filename: string,
    userId: string,
  ): Promise<string> {
    const key = this.getKey(id, filename, userId);
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    }); // 1 hour
    return signedUrl;
  }

  getKey(id: string, filename: string, userId: string): string {
    return `receipts/${userId}/${id}-${filename}`;
  }
}
