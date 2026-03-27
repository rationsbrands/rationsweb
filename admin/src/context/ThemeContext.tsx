import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme
    return saved || 'system'
  })

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove previous classes
    root.classList.remove('light', 'dark')

    let computedDark = false
    if (theme === 'system') {
      computedDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      computedDark = theme === 'dark'
    }

    setIsDark(computedDark)
    
    if (computedDark) {
      root.classList.add('dark')
    } else {
      root.classList.add('light')
    }

    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for system changes if in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement
      if (e.matches) {
        root.classList.add('dark')
        root.classList.remove('light')
        setIsDark(true)
      } else {
        root.classList.remove('dark')
        root.classList.add('light')
        setIsDark(false)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
