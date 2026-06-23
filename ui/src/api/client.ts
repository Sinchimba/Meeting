import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AuthResponse {
  accessToken: string;
  refreshToken?: {
    id: string;
    token: string;
    expiresAt: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: {
    id: string;
    token: string;
  };
}

class ApiClient {
  private client: AxiosInstance;
  private tokens: AuthTokens | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      if (this.tokens?.accessToken) {
        config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
      }
      return config;
    });
  }

  setTokens(tokens: AuthTokens) {
    this.tokens = tokens;
    localStorage.setItem('authTokens', JSON.stringify(tokens));
  }

  getTokens(): AuthTokens | null {
    if (!this.tokens) {
      const stored = localStorage.getItem('authTokens');
      if (stored) {
        this.tokens = JSON.parse(stored);
      }
    }
    return this.tokens;
  }

  clearTokens() {
    this.tokens = null;
    localStorage.removeItem('authTokens');
  }

  // Auth
  async register(name: string, email: string, password: string, role = 'standard'): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
      role,
    });
    this.setTokens({ accessToken: response.data.accessToken, refreshToken: response.data.refreshToken });
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', { email, password });
    this.setTokens({ accessToken: response.data.accessToken, refreshToken: response.data.refreshToken });
    return response.data;
  }

  async logout(): Promise<void> {
    const tokens = this.getTokens();
    if (tokens?.refreshToken?.id) {
      try {
        await this.client.post('/auth/logout', { sessionId: tokens.refreshToken.id });
      } catch (err) {
        // Continue anyway
      }
    }
    this.clearTokens();
  }

  async refresh(): Promise<string> {
    const tokens = this.getTokens();
    if (!tokens?.refreshToken) throw new Error('No refresh token');
    const response = await this.client.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });
    this.setTokens({ accessToken: response.data.accessToken, refreshToken: tokens.refreshToken });
    return response.data.accessToken;
  }

  // Users
  async getMe() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  // Meetings
  async createMeeting(title: string) {
    const response = await this.client.post('/meetings', { title });
    return response.data;
  }

  async getMeeting(id: string) {
    const response = await this.client.get(`/meetings/${id}`);
    return response.data;
  }

  async endMeeting(id: string) {
    const response = await this.client.post(`/meetings/${id}/end`);
    return response.data;
  }

  async getMeetingTranslations(id: string) {
    const response = await this.client.get(`/meetings/${id}/translations`);
    return response.data;
  }

  async inviteToMeeting(id: string, phone: string) {
    const response = await this.client.post(`/meetings/${id}/invite`, { phone });
    return response.data;
  }

  // SMS Monitoring & Retry
  async getSmsLogs() {
    const response = await this.client.get('/sms/logs');
    return response.data;
  }

  async retrySms(id: string) {
    const response = await this.client.post(`/sms/retry/${id}`);
    return response.data;
  }

  // Health
  async health() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
