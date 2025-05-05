const isProduction = import.meta.env.VITE_ENVIRONMENT === 'production';

export const API_BASE_URL = isProduction 
  ? import.meta.env.VITE_PROD_API_URL 
  : import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:8000';

export const BASE_URL = isProduction
  ? import.meta.env.VITE_PROD_BASE_URL
  : import.meta.env.VITE_LOCAL_BASE_URL || 'http://localhost:3000'; 