import axios from 'axios'

const normalizeBackendUrl = (url) => {
  if (!url) return 'http://localhost:4000'
  const trimmed = url.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `http://${trimmed}`
}

const BACKEND_URL = normalizeBackendUrl(import.meta.env.VITE_BACKEND_URL) || 'http://localhost:4000'

// Create axios instance with custom config
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach auth token from localStorage for protected backend requests
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('authTokens')
    if (stored) {
      const tokens = JSON.parse(stored)
      if (tokens?.accessToken) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${tokens.accessToken}`
      }
    }
  } catch (error) {
    console.warn('Failed to read auth token from storage:', error)
  }
  return config
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth information and redirect to login
      localStorage.removeItem('authTokens')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
