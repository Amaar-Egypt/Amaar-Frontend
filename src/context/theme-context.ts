import { createContext } from 'react'

export type AppTheme = 'dark' | 'light'

export interface ThemeContextValue {
  theme: AppTheme
  isDarkMode: boolean
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
