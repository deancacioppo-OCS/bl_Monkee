// API Configuration
export const API_CONFIG = {
  // Backend URL - defaults to localhost for development
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  
  // API Endpoints
  ENDPOINTS: {
    GEMINI_PROXY: '/api/gemini-proxy',
    CRAWL: '/api/crawl',
    CLIENTS: '/api/clients',
    CLIENT: (clientId: string) => `/api/clients/${clientId}`,
    CLIENT_TOPICS: (clientId: string) => `/api/clients/${clientId}/used-topics`,
    CLIENT_SITEMAP: (clientId: string) => `/api/clients/${clientId}/sitemap-urls`,
    SITEMAP_PROXY: '/api/sitemap-proxy',
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BACKEND_URL}${endpoint}`;
};
