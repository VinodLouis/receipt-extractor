// services/ExtractionService.ts
import { BaseService } from './base.service';
import { Extraction } from '../types';

export class ExtractionService extends BaseService {
  constructor() {
    super('extractions'); // pass entity name
  }

  async createExtraction(file: File): Promise<Extraction> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post(`/api/${this.entity}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getExtractions(): Promise<Extraction[]> {
    return this.getAll<Extraction>();
  }
}

export const extractionService = new ExtractionService();
