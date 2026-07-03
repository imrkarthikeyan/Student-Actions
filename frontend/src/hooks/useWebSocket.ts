import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useClipboardStore } from '../store/clipboardStore'
import type { ClipboardItem } from '../types'

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { prependItem, updateItemInList, removeItemFromList } = useClipboardStore()

  useEffect(() => {
    const socket = io('/', {
      path: '/ws/socket.io',
      transports: ['websocket'],
    })

    socket.on('clipboard_created', (item: ClipboardItem) => prependItem(item))
    socket.on('clipboard_updated', (item: ClipboardItem) => updateItemInList(item))
    socket.on('clipboard_deleted', ({ id }: { id: string }) => removeItemFromList(id))

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [prependItem, updateItemInList, removeItemFromList])

  const joinWorkspace = (workspace_id: string) => {
    socketRef.current?.emit('join_workspace', { workspace_id })
  }

  const leaveWorkspace = (workspace_id: string) => {
    socketRef.current?.emit('leave_workspace', { workspace_id })
  }

  return { joinWorkspace, leaveWorkspace }
}
