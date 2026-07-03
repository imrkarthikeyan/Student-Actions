import { api } from './api'
import type {
  ClipboardItem, ClipboardListResponse, ClipboardFilter,
  AICommandResponse, SemanticSearchResult, ClipboardType,
} from '../types'

export const clipboardService = {
  async list(filters: ClipboardFilter = {}): Promise<ClipboardListResponse> {
    const res = await api.get<ClipboardListResponse>('/clipboard/', { params: filters })
    return res.data
  },
  async get(id: string): Promise<ClipboardItem> {
    const res = await api.get<ClipboardItem>(`/clipboard/${id}`)
    return res.data
  },
  async create(data: {
    content_type: ClipboardType
    content?: string
    title?: string
    tags?: string[]
    workspace_id?: string
  }): Promise<ClipboardItem> {
    const res = await api.post<ClipboardItem>('/clipboard/', data)
    return res.data
  },
  async update(id: string, data: Partial<{
    title: string
    content: string
    tags: string[]
    is_favorite: boolean
    is_pinned: boolean
  }>): Promise<ClipboardItem> {
    const res = await api.put<ClipboardItem>(`/clipboard/${id}`, data)
    return res.data
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/clipboard/${id}`)
  },
  async restore(id: string): Promise<ClipboardItem> {
    const res = await api.post<ClipboardItem>(`/clipboard/${id}/restore`)
    return res.data
  },
  async upload(file: File, workspace_id?: string): Promise<ClipboardItem> {
    const form = new FormData()
    form.append('file', file)
    const params: Record<string, string> = {}
    if (workspace_id) params.workspace_id = workspace_id
    const res = await api.post<ClipboardItem>('/clipboard/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    })
    return res.data
  },
  async runAICommand(
    clipboard_item_id: string,
    command: string,
    extra_params?: Record<string, unknown>
  ): Promise<AICommandResponse> {
    const res = await api.post<AICommandResponse>('/clipboard/ai/command', {
      clipboard_item_id,
      command,
      extra_params,
    })
    return res.data
  },
  async semanticSearch(query: string, limit = 10): Promise<SemanticSearchResult[]> {
    const res = await api.post<SemanticSearchResult[]>('/clipboard/search/semantic', { query, limit })
    return res.data
  },
}
