import { api } from './api';
export const clipboardService = {
    async list(filters = {}) {
        const res = await api.get('/clipboard/', { params: filters });
        return res.data;
    },
    async get(id) {
        const res = await api.get(`/clipboard/${id}`);
        return res.data;
    },
    async create(data) {
        const res = await api.post('/clipboard/', data);
        return res.data;
    },
    async update(id, data) {
        const res = await api.put(`/clipboard/${id}`, data);
        return res.data;
    },
    async delete(id) {
        await api.delete(`/clipboard/${id}`);
    },
    async restore(id) {
        const res = await api.post(`/clipboard/${id}/restore`);
        return res.data;
    },
    async upload(file, workspace_id) {
        const form = new FormData();
        form.append('file', file);
        const params = {};
        if (workspace_id)
            params.workspace_id = workspace_id;
        const res = await api.post('/clipboard/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            params,
        });
        return res.data;
    },
    async runAICommand(clipboard_item_id, command, extra_params) {
        const res = await api.post('/clipboard/ai/command', {
            clipboard_item_id,
            command,
            extra_params,
        });
        return res.data;
    },
    async semanticSearch(query, limit = 10) {
        const res = await api.post('/clipboard/search/semantic', { query, limit });
        return res.data;
    },
};
