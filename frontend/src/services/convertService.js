import { api } from './api';
export const convertService = {
    async getFormats() {
        const res = await api.get('/convert/formats');
        return res.data;
    },
    async convert(file, targetFormat) {
        const form = new FormData();
        form.append('file', file);
        form.append('target_format', targetFormat);
        const res = await api.post('/convert/', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
};
