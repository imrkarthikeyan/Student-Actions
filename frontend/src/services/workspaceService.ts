import { api } from './api'
import type { Workspace, WorkspaceMember } from '../types'

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const res = await api.get<Workspace[]>('/workspaces/')
    return res.data
  },
  async get(id: string): Promise<Workspace> {
    const res = await api.get<Workspace>(`/workspaces/${id}`)
    return res.data
  },
  async create(data: { name: string; description?: string; slug?: string }): Promise<Workspace> {
    const res = await api.post<Workspace>('/workspaces/', data)
    return res.data
  },
  async invite(workspace_id: string, email: string, role: string): Promise<{ message: string; invite_token: string }> {
    const res = await api.post(`/workspaces/${workspace_id}/invite`, { email, role })
    return res.data
  },
  async members(workspace_id: string): Promise<WorkspaceMember[]> {
    const res = await api.get<WorkspaceMember[]>(`/workspaces/${workspace_id}/members`)
    return res.data
  },
  async removeMember(workspace_id: string, user_id: string): Promise<void> {
    await api.delete(`/workspaces/${workspace_id}/members/${user_id}`)
  },
}
