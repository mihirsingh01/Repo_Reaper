import { apiClient } from './client';
import { Idea, Feature, SearchResultsResponse } from './types';

export const ideasApi = {
  async submitIdea(rawText: string): Promise<{ ideaId: string; refined: any; status: string }> {
    const res = await apiClient.post<{ ideaId: string; refined: any; status: string }>('/ideas', { rawText });
    return res.data;
  },

  async getIdeas(): Promise<Idea[]> {
    const res = await apiClient.get<Idea[]>('/ideas');
    return res.data;
  },

  async getIdea(id: string): Promise<Idea> {
    const res = await apiClient.get<Idea>(`/ideas/${id}`);
    return res.data;
  },

  async confirmChecklist(id: string, features: Feature[]): Promise<{ success: boolean; checklistHash: string; status: string }> {
    const res = await apiClient.patch<{ success: boolean; checklistHash: string; status: string }>(`/ideas/${id}`, {
      status: 'confirmed',
      features,
    });
    return res.data;
  },

  async startSearch(id: string): Promise<{ ideaId: string; queryId: string; status: string; cached: boolean }> {
    const res = await apiClient.post<{ ideaId: string; queryId: string; status: string; cached: boolean }>(`/ideas/${id}/search`);
    return res.data;
  },

  async getResults(id: string): Promise<SearchResultsResponse> {
    const res = await apiClient.get<SearchResultsResponse>(`/ideas/${id}/results`);
    return res.data;
  },
};
