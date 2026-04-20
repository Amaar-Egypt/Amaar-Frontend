import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { ThemeContext, type AppTheme } from './theme-context'

const THEME_STORAGE_KEY = 'amaar.ui.theme'

const readStoredTheme = (): AppTheme => {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // Ignore storage read errors and fallback to dark mode.
  }

  return 'dark'
}

const applyThemeClass = (theme: AppTheme) => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.setAttribute('data-theme', theme)
}

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setThemeState] = useState<AppTheme>(() => readStoredTheme())

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme)

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Ignore storage write errors in restricted modes.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
