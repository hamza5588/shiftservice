// Environment configuration
const environment = process.env.REACT_APP_ENVIRONMENT || 'local';

// Configuration object
const config = {
    local: {
        apiUrl: process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:8000',
        baseUrl: process.env.REACT_APP_LOCAL_BASE_URL || 'http://localhost:3000'
    },
    production: {
        apiUrl: process.env.REACT_APP_PROD_API_URL || 'http://69.28.88.75:8000',
        baseUrl: process.env.REACT_APP_PROD_BASE_URL || 'http://69.28.88.75:3000'
    }
};

// Export the current configuration based on environment
export const currentConfig = config[environment as keyof typeof config]; 