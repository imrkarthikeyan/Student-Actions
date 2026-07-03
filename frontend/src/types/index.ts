export type ClipboardType = 'text' | 'image' | 'file' | 'url' | 'code' | 'markdown'

export interface User {
  id: string
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  is_verified: boolean
  storage_used_bytes: number
  storage_limit_bytes: number
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ClipboardItem {
  id: string
  content_type: ClipboardType
  content: string | null
  title: string | null
  summary: string | null
  category: string | null
  language: string | null
  ocr_text: string | null
  tags: string[]
  is_favorite: boolean
  is_pinned: boolean
  is_deleted: boolean
  is_shared: boolean
  share_token: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  thumbnail_path: string | null
  workspace_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  accessed_at: string | null
  access_count: number
  extra_metadata: Record<string, unknown>
}

export interface ClipboardListResponse {
  items: ClipboardItem[]
  total: number
  page: number
  per_page: number
  has_next: boolean
}

export interface ClipboardFilter {
  content_type?: ClipboardType
  category?: string
  is_favorite?: boolean
  workspace_id?: string
  search?: string
  include_deleted?: boolean
  page?: number
  per_page?: number
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  slug: string
  avatar_url: string | null
  is_personal: boolean
  member_count: number
  created_at: string
}

export interface WorkspaceMember {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  joined_at: string
}

export interface AICommandResponse {
  result: string
  command: string
  tokens_used?: number
}

export interface SemanticSearchResult extends ClipboardItem {
  score: number
}

export type MeetingStatus = 'scheduled' | 'live' | 'ended'

export interface Meeting {
  id: string
  room_code: string
  title: string
  host_name: string | null
  status: MeetingStatus
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}
