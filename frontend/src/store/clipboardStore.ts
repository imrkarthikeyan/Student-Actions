import { create } from 'zustand'
import type { ClipboardItem, ClipboardFilter, Workspace } from '../types'
import { clipboardService } from '../services/clipboardService'
import { workspaceService } from '../services/workspaceService'

interface ClipboardState {
  items: ClipboardItem[]
  total: number
  page: number
  hasNext: boolean
  isLoading: boolean
  filters: ClipboardFilter
  workspaces: Workspace[]
  selectedItem: ClipboardItem | null

  fetchItems: (filters?: ClipboardFilter) => Promise<void>
  fetchMore: () => Promise<void>
  fetchWorkspaces: () => Promise<void>
  createItem: (data: Parameters<typeof clipboardService.create>[0]) => Promise<ClipboardItem>
  updateItem: (id: string, data: Parameters<typeof clipboardService.update>[1]) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  restoreItem: (id: string) => Promise<void>
  toggleFavorite: (item: ClipboardItem) => Promise<void>
  togglePin: (item: ClipboardItem) => Promise<void>
  setFilters: (f: ClipboardFilter) => void
  setSelectedItem: (item: ClipboardItem | null) => void
  prependItem: (item: ClipboardItem) => void
  updateItemInList: (item: ClipboardItem) => void
  removeItemFromList: (id: string) => void
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  hasNext: false,
  isLoading: false,
  filters: { page: 1, per_page: 30 },
  workspaces: [],
  selectedItem: null,

  fetchItems: async (filters = {}) => {
    const merged = { ...get().filters, ...filters, page: 1 }
    set({ isLoading: true, filters: merged })
    try {
      const res = await clipboardService.list(merged)
      set({ items: res.items, total: res.total, page: 1, hasNext: res.has_next, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchMore: async () => {
    if (!get().hasNext || get().isLoading) return
    const nextPage = get().page + 1
    const filters = { ...get().filters, page: nextPage }
    set({ isLoading: true })
    try {
      const res = await clipboardService.list(filters)
      set((s) => ({
        items: [...s.items, ...res.items],
        page: nextPage,
        hasNext: res.has_next,
        isLoading: false,
      }))
    } catch {
      set({ isLoading: false })
    }
  },

  fetchWorkspaces: async () => {
    const ws = await workspaceService.list()
    set({ workspaces: ws })
  },

  createItem: async (data) => {
    const item = await clipboardService.create(data)
    set((s) => ({ items: [item, ...s.items], total: s.total + 1 }))
    return item
  },

  updateItem: async (id, data) => {
    const updated = await clipboardService.update(id, data)
    set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }))
    if (get().selectedItem?.id === id) set({ selectedItem: updated })
  },

  deleteItem: async (id) => {
    await clipboardService.delete(id)
    set((s) => ({ items: s.items.filter((i) => i.id !== id), total: s.total - 1 }))
    if (get().selectedItem?.id === id) set({ selectedItem: null })
  },

  restoreItem: async (id) => {
    const restored = await clipboardService.restore(id)
    set((s) => ({ items: s.items.map((i) => (i.id === id ? restored : i)) }))
  },

  toggleFavorite: async (item) => {
    await get().updateItem(item.id, { is_favorite: !item.is_favorite })
  },

  togglePin: async (item) => {
    await get().updateItem(item.id, { is_pinned: !item.is_pinned })
  },

  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),

  setSelectedItem: (item) => set({ selectedItem: item }),

  prependItem: (item) => set((s) => ({ items: [item, ...s.items], total: s.total + 1 })),

  updateItemInList: (item) =>
    set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),

  removeItemFromList: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id), total: s.total - 1 })),
}))
