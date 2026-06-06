import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

function getStoredTheme() {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('fileora-theme')) {
    return localStorage.getItem('fileora-theme');
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getPrerenderedTheme() {
  if (typeof document === 'undefined') return null;
  const root = document.getElementById('root');
  if (!root?.querySelector('.app-shell')) return null;
  if (document.documentElement.classList.contains('light')) return 'light';
  if (document.documentElement.classList.contains('dark')) return 'dark';
  return 'dark';
}

function applyThemeClass(theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => getPrerenderedTheme() ?? getStoredTheme());

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored !== theme) {
      setTheme(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after hydration
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem('fileora-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};