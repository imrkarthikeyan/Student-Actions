import axios from 'axios';

// In dev this is empty and Vite's proxy forwards /api, /ws, /storage to the
// local backend. In production (frontend and backend on different domains)
// set VITE_API_BASE_URL to the backend's origin, e.g. https://foo.onrender.com
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export function resolveStorageUrl(path) {
    return path ? `${API_BASE_URL}${path}` : path;
}

export const api = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: { 'Content-Type': 'application/json' },
});
