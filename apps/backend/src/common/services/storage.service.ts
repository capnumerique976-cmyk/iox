import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService {
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'iox-documents');

    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    this.ensureBucket().catch((err) =>
      this.logger.warn(`Bucket init warning: ${err?.message ?? err}`),
    );
  }

  /** Guarantee the bucket exists (called at startup, non-blocking). */
  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
      this.logger.log(`Bucket "${this.bucket}" created.`);
    }
  }

  /**
   * Upload a file buffer.
   * @param storageKey   Full path inside bucket, e.g. "documents/product_batch/uuid/filename.pdf"
   * @param buffer       File content
   * @param mimeType     Content-type header
   */
  async upload(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      await this.client.putObject(this.bucket, storageKey, buffer, buffer.length, {
        'Content-Type': mimeType,
      });
    } catch (err) {
      this.logger.error('MinIO upload failed', err);
      throw new InternalServerErrorException('Échec du stockage du fichier.');
    }
  }

  /**
   * Generate a time-limited pre-signed GET URL (default 1 hour).
   */
  async getPresignedUrl(storageKey: string, expirySeconds = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(this.bucket, storageKey, expirySeconds);
    } catch (err) {
      this.logger.error('MinIO presign failed', err);
      throw new InternalServerErrorException('Impossible de générer le lien de téléchargement.');
    }
  }

  /**
   * Delete an object from storage.
   */
  async delete(storageKey: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, storageKey);
    } catch (err) {
      this.logger.warn(`MinIO delete failed for key "${storageKey}": ${(err as Error)?.message}`);
    }
  }

  /**
   * Build a storage key for a document.
   * Pattern: documents/{entityType}/{entityId}/{timestamp}-{sanitizedFilename}
   */
  static buildKey(entityType: string, entityId: string, originalFilename: string): string {
    const timestamp = Date.now();
    const safe = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documents/${entityType.toLowerCase()}/${entityId}/${timestamp}-${safe}`;
  }
}
