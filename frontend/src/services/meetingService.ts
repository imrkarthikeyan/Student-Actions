import { api } from './api'
import type { Meeting } from '../types'

export const meetingService = {
  async create(data: { title?: string; host_name?: string; scheduled_at?: string | null }): Promise<Meeting> {
    const res = await api.post<Meeting>('/meetings/', data)
    return res.data
  },
  async list(): Promise<Meeting[]> {
    const res = await api.get<{ meetings: Meeting[] }>('/meetings/')
    return res.data.meetings
  },
  async get(roomCode: string): Promise<Meeting> {
    const res = await api.get<Meeting>(`/meetings/${roomCode}`)
    return res.data
  },
  async start(roomCode: string): Promise<Meeting> {
    const res = await api.post<Meeting>(`/meetings/${roomCode}/start`)
    return res.data
  },
  async end(roomCode: string): Promise<Meeting> {
    const res = await api.post<Meeting>(`/meetings/${roomCode}/end`)
    return res.data
  },
}
