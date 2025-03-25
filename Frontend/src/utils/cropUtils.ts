
// Re-export from all the separated files
export * from './types/cropTypes';
export * from './data/mockData';
export * from './api/cropApi';
export * from './api/nurseryApi';
export * from './storage/cropStorage';
export * from './helpers/cropHelpers';

// Determine the API base URL - used for consistency across all API calls
export const getApiBaseUrl = () => {
  // Return the fixed base URL per requirements
  return 'https://pocketfarm1.onrender.com';
};
