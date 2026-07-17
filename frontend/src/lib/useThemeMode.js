import { useEffect, useState } from 'react';

// Shared dark-mode state for every TASCK shell (admin, brand/creator portal, V3).
// Default follows the USER'S SYSTEM theme (prefers-color-scheme); the header
// toggle overrides it, and that manual choice is remembered across sessions.
// While no manual choice has been made, flipping the OS theme flips the app live.
const STORAGE_KEY = 'tasck-theme'; // 'dark' | 'light' (absent = follow system)

const systemPrefersDark = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-color-scheme: dark)').matches
);

const initialMode = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch (e) { /* storage blocked - fall through to system */ }
  return systemPrefersDark();
};

export const useThemeMode = () => {
  const [darkMode, setDarkModeState] = useState(initialMode);

  // Track OS theme changes, but only while the user hasn't chosen manually.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY)) return; // manual choice wins
      } catch (e) { /* ignore */ }
      setDarkModeState(event.matches);
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange);
      else if (media.removeListener) media.removeListener(onChange);
    };
  }, []);

  const setDarkMode = (next) => {
    const value = typeof next === 'function' ? next(darkMode) : next;
    setDarkModeState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
    } catch (e) { /* storage blocked - session-only toggle */ }
  };

  return [darkMode, setDarkMode];
};

export default useThemeMode;
