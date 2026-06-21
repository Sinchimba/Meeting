import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'standard' | 'mute' | 'deaf' | 'admin';
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUserFromToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  // Load from localStorage on init
  const savedTokens = localStorage.getItem('authTokens');
  if (savedTokens) {
    const tokens = JSON.parse(savedTokens);
    if (tokens.accessToken) {
      apiClient.setTokens(tokens);
    }
  }

  return {
    user: null,
    accessToken: savedTokens ? JSON.parse(savedTokens).accessToken : null,
    isLoading: false,
    error: null,
    isAuthenticated: !!savedTokens,

    register: async (name, email, password, role = 'standard') => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.register(name, email, password, role);
        localStorage.setItem('user', JSON.stringify(response.user || null));
        set({
          user: response.user || null,
          accessToken: response.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        const message = error.response?.data?.error || error.message || 'Registration failed';
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.login(email, password);
        const user = await apiClient.getMe();
        localStorage.setItem('user', JSON.stringify(user));
        set({
          user,
          accessToken: response.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error: any) {
        const message = error.response?.data?.error || error.message || 'Login failed';
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        await apiClient.logout();
      } catch (err) {
        // Continue anyway
      }
      set({ user: null, accessToken: null, isAuthenticated: false });
    },

    loadUserFromToken: async () => {
      const tokens = apiClient.getTokens();
      if (!tokens?.accessToken) {
        set({ isAuthenticated: false });
        return;
      }

      try {
        const user = await apiClient.getMe();
        set({ user, isAuthenticated: true });
      } catch (error) {
        set({ user: null, isAuthenticated: false });
      }
    },

    setUser: (user) => set({ user }),
    setError: (error) => set({ error }),
  };
});
