import { api } from './api';
export const workspaceService = {
    async list() {
        const res = await api.get('/workspaces/');
        return res.data;
    },
    async get(id) {
        const res = await api.get(`/workspaces/${id}`);
        return res.data;
    },
    async create(data) {
        const res = await api.post('/workspaces/', data);
        return res.data;
    },
    async invite(workspace_id, email, role) {
        const res = await api.post(`/workspaces/${workspace_id}/invite`, { email, role });
        return res.data;
    },
    async members(workspace_id) {
        const res = await api.get(`/workspaces/${workspace_id}/members`);
        return res.data;
    },
    async removeMember(workspace_id, user_id) {
        await api.delete(`/workspaces/${workspace_id}/members/${user_id}`);
    },
};
