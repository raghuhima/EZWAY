export const API_BASE = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : '';
export const SOCKET_URL = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : window.location.origin;
