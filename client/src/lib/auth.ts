import { config } from '../config/env';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await fetch(`${config.backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
};

export const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
  const response = await fetch(`${config.backendUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
};

export const getCurrentUser = async (token: string): Promise<AuthResponse['user']> => {
  const response = await fetch(`${config.backendUrl}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get current user');
  }

  const data = await response.json();
  return data.user;
};

export const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const validateStoredAuth = async (): Promise<{ isValid: boolean; user?: AuthResponse['user'] }> => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return { isValid: false };
  }

  try {
    const user = await getCurrentUser(token);
    return { isValid: true, user };
  } catch (error) {
    // Token is invalid, clear stored data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    return { isValid: false };
  }
};
