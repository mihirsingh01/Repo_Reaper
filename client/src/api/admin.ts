import { apiClient } from './client';
import { IngestionJobItem } from './types';

export const adminApi = {
  async triggerIngest(language?: string, window?: string): Promise<{ jobId: string; status: string }> {
    const res = await apiClient.post<{ jobId: string; status: string }>('/admin/ingest', { language, window });
    return res.data;
  },

  async getIngestJob(id: string): Promise<IngestionJobItem> {
    const res = await apiClient.get<IngestionJobItem>(`/admin/ingest/${id}`);
    return res.data;
  },
};
