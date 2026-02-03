// services/BaseService.ts
import axios, { AxiosInstance } from 'axios';

const API_URL = import.meta.env.API_URL || 'http://localhost:3000';

export class BaseService {
  protected api: AxiosInstance;
  protected entity: string;

  constructor(entity: string) {
    this.entity = entity;
    this.api = axios.create({
      baseURL: API_URL,
    });

    // Add token to all requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('userToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getAll<T>(params?: Record<string, any>): Promise<T[]> {
    const response = await this.api.get(`/api/${this.entity}`, { params });
    return response.data;
  }

  async getById<T>(id: string): Promise<T> {
    const response = await this.api.get(`/api/${this.entity}/${id}`);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/api/${this.entity}/${id}`);
  }
}
