import { api } from './api';
export const shareService = {
    async createText(content, expires_in_minutes) {
        const res = await api.post('/share/', { content, expires_in_minutes });
        return res.data;
    },
    async createFile(file, expires_in_minutes) {
        const form = new FormData();
        form.append('file', file);
        form.append('expires_in_minutes', String(expires_in_minutes));
        const res = await api.post('/share/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
    async retrieve(code) {
        const res = await api.get(`/share/${code}`);
        return res.data;
    },
};
