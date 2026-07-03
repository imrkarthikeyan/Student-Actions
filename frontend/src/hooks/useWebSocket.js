import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useClipboardStore } from '../store/clipboardStore';
export function useWebSocket() {
    const socketRef = useRef(null);
    const { prependItem, updateItemInList, removeItemFromList } = useClipboardStore();
    useEffect(() => {
        const socket = io('/', {
            path: '/ws/socket.io',
            transports: ['websocket'],
        });
        socket.on('clipboard_created', (item) => prependItem(item));
        socket.on('clipboard_updated', (item) => updateItemInList(item));
        socket.on('clipboard_deleted', ({ id }) => removeItemFromList(id));
        socketRef.current = socket;
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [prependItem, updateItemInList, removeItemFromList]);
    const joinWorkspace = (workspace_id) => {
        socketRef.current?.emit('join_workspace', { workspace_id });
    };
    const leaveWorkspace = (workspace_id) => {
        socketRef.current?.emit('leave_workspace', { workspace_id });
    };
    return { joinWorkspace, leaveWorkspace };
}
