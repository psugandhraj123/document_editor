// Environment configuration
export const config = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
} as const;
