import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const THEME_KEY = 'hostel_theme';

const ThemeContext = createContext(null);

/**
 * Determine initial theme:
 * 1. Read from localStorage ('hostel_theme')
 * 2. If valid ('light' or 'dark'), use it.
 * 3. Otherwise, check window.matchMedia for system preference.
 * 4. Fallback to 'light'.
 */
function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (err) {
    console.warn('Failed to read theme preference from localStorage:', err);
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Synchronize <html> root class and localStorage whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.warn('Failed to save theme preference to localStorage:', err);
    }
  }, [theme]);

  // Toggle between 'light' and 'dark'
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Explicit setter with validation
  const setTheme = useCallback((newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme);
    }
  }, []);

  const value = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
