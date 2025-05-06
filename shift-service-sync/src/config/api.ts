// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export { API_BASE_URL };
export const API_URL = API_BASE_URL; 