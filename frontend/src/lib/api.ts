import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' }
})

// Attach auth token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ce_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle session invalidated (logged in from another device)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.code
      if (code === 'SESSION_INVALIDATED') {
        localStorage.removeItem('ce_token')
        window.location.href = '/login?reason=session_expired'
      }
    }
    return Promise.reject(error)
  }
)
