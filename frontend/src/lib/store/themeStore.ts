import { create } from 'zustand'

const stored     = localStorage.getItem('ce_theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const startDark  = stored ? stored === 'dark' : prefersDark

document.documentElement.classList.toggle('dark', startDark)

interface ThemeState {
  dark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  dark: startDark,
  toggle: () => {
    const next = !get().dark
    localStorage.setItem('ce_theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    set({ dark: next })
  }
}))
