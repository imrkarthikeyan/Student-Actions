import { api } from './api'

export interface ShareCreateResponse {
  code: string
  expires_at: string
}

export interface ShareRetrieveResponse {
  content_type: 'text' | 'file'
  content?: string
  file_name?: string
  file_url?: string
  mime_type?: string
  file_size?: number
  expires_at: string
  view_count: number
}

export const shareService = {
  async createText(content: string, expires_in_minutes: number): Promise<ShareCreateResponse> {
    const res = await api.post<ShareCreateResponse>('/share/', { content, expires_in_minutes })
    return res.data
  },
  async createFile(file: File, expires_in_minutes: number): Promise<ShareCreateResponse> {
    const form = new FormData()
    form.append('file', file)
    form.append('expires_in_minutes', String(expires_in_minutes))
    const res = await api.post<ShareCreateResponse>('/share/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
  async retrieve(code: string): Promise<ShareRetrieveResponse> {
    const res = await api.get<ShareRetrieveResponse>(`/share/${code}`)
    return res.data
  },
}
