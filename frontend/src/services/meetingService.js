import { api } from './api';
export const meetingService = {
    async create(data) {
        const res = await api.post('/meetings/', data);
        return res.data;
    },
    async list() {
        const res = await api.get('/meetings/');
        return res.data.meetings;
    },
    async get(roomCode) {
        const res = await api.get(`/meetings/${roomCode}`);
        return res.data;
    },
    async start(roomCode) {
        const res = await api.post(`/meetings/${roomCode}/start`);
        return res.data;
    },
    async end(roomCode) {
        const res = await api.post(`/meetings/${roomCode}/end`);
        return res.data;
    },
};
