// Environment-based configuration for PocketFarm Frontend

// API URL Configuration - automatically switches between development and production
const API_URLS = {
  development: 'http://127.0.0.1:5000',
  production: 'https://pocketfarm1.onrender.com'
};

// Determine the current environment
const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
const environment = isProduction ? 'production' : 'development';

// Configuration object
const config = {
  // API base URL for backend calls
  API_BASE_URL: API_URLS[environment],
  
  // Socket.IO configuration
  SOCKET_URL: API_URLS[environment],
  
  // Configuration flags
  useMockDataOnFailure: !isProduction,
  
  // Debug settings
  debug: !isProduction,
  
  // Current environment 
  environment
};

// Log the configuration in non-production environments
if (!isProduction) {
  console.log('PocketFarm Config:', config);
}

export default config; 