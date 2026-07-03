import { api } from './api'

export interface ConvertResponse {
  file_name: string
  file_url: string
  mime_type: string
  file_size: number
}

export interface ConversionFormatsResponse {
  formats: Record<string, string[]>
  max_file_size_mb: number
}

export const convertService = {
  async getFormats(): Promise<ConversionFormatsResponse> {
    const res = await api.get<ConversionFormatsResponse>('/convert/formats')
    return res.data
  },
  async convert(file: File, targetFormat: string): Promise<ConvertResponse> {
    const form = new FormData()
    form.append('file', file)
    form.append('target_format', targetFormat)
    const res = await api.post<ConvertResponse>('/convert/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
}
