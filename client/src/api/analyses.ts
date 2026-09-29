import { apiClient } from './client';
import { AnalysisDetail } from './types';

export const analysesApi = {
  async getAnalysis(id: string): Promise<AnalysisDetail> {
    const res = await apiClient.get<AnalysisDetail>(`/analyses/${id}`);
    return res.data;
  },

  async getBrief(id: string): Promise<string> {
    const res = await apiClient.get<string>(`/analyses/${id}/brief`, {
      responseType: 'text',
    });
    return res.data;
  },
};
