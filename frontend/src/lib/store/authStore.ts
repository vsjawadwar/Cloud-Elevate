import { create } from 'zustand'
import type { User } from '@cloud-elevate/shared'

interface AuthState {
  user:     User | null
  token:    string | null
  isAdmin:  boolean
  ready:    boolean          // true once we've checked localStorage token
  setAuth:  (user: User, token: string, isAdmin?: boolean) => void
  clearAuth: () => void
  setReady: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  token:   localStorage.getItem('ce_token'),
  isAdmin: false,
  ready:   false,

  setAuth: (user, token, isAdmin = false) => {
    localStorage.setItem('ce_token', token)
    set({ user, token, isAdmin, ready: true })
  },

  clearAuth: () => {
    localStorage.removeItem('ce_token')
    set({ user: null, token: null, isAdmin: false, ready: true })
  },

  setReady: (v) => set({ ready: v })
}))
