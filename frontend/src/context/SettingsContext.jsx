import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const defaultAvatar = 'https://api.dicebear.com/9.x/avataaars/svg?seed=default';
  const defaultNickname = 'Commander';
  const normalizeTheme = (value) => {
    if (value === 'super-light') return 'light';
    if (value === 'super-dark') return 'dark';
    if (value === 'medium') return 'auto';
    if (value === 'light' || value === 'dark' || value === 'auto') return value;
    return 'dark';
  };

  const [theme, setTheme] = useState(() => normalizeTheme(localStorage.getItem('theme')));
  const [accentColor, setAccentColor] = useState(localStorage.getItem('accentColor') || 'blue');
  const [fontSize, setFontSize] = useState(localStorage.getItem('fontSize') || 'medium');
  const [fontFamily, setFontFamily] = useState(localStorage.getItem('fontFamily') || 'inter');
  const [highContrast, setHighContrast] = useState(localStorage.getItem('highContrast') === 'true');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('reduceMotion') === 'true');
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('soundEnabled') !== 'false');
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar') || defaultAvatar);
  const [nickname, setNickname] = useState(localStorage.getItem('nickname') || defaultNickname);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load all settings from backend on mount
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          // No token = not logged in, reset to defaults
          setTheme('dark');
          setAccentColor('blue');
          setFontSize('medium');
          setFontFamily('inter');
          setHighContrast(false);
          setReduceMotion(false);
          setSoundEnabled(true);
          setAvatar(defaultAvatar);
          setNickname(defaultNickname);
          setIsLoaded(true);
          return;
        }

        const response = await fetch('http://localhost:5000/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const user = data.user;

          // Load settings from backend (USER-SPECIFIC)
          if (user.settings) {
            const nextTheme = normalizeTheme(user.settings.theme || 'dark');
            setTheme(nextTheme);
            setAccentColor(user.settings.accentColor || 'blue');
            setFontSize(user.settings.fontSize || 'medium');
            setFontFamily(user.settings.fontFamily || 'inter');
            setHighContrast(user.settings.highContrast || false);
            setReduceMotion(user.settings.reduceMotion || false);
            setSoundEnabled(user.settings.soundEnabled !== false);

            // Update localStorage cache
            localStorage.setItem('theme', nextTheme);
            localStorage.setItem('accentColor', user.settings.accentColor || 'blue');
            localStorage.setItem('fontSize', user.settings.fontSize || 'medium');
            localStorage.setItem('fontFamily', user.settings.fontFamily || 'inter');
            localStorage.setItem('highContrast', user.settings.highContrast || false);
            localStorage.setItem('reduceMotion', user.settings.reduceMotion || false);
            localStorage.setItem('soundEnabled', user.settings.soundEnabled !== false);
          }

          // Load avatar and nickname (USER-SPECIFIC)
          if (user.avatar) {
            setAvatar(user.avatar);
            localStorage.setItem('avatar', user.avatar);
          }
          if (user.nickname) {
            setNickname(user.nickname);
            localStorage.setItem('nickname', user.nickname);
          }
        } else {
          // Invalid token, reset to defaults
          setTheme('dark');
          setAccentColor('blue');
          setFontSize('medium');
          setFontFamily('inter');
          setHighContrast(false);
          setReduceMotion(false);
          setSoundEnabled(true);
          setAvatar(defaultAvatar);
          setNickname(defaultNickname);
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadUserSettings();
  }, []);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    root.setAttribute('data-theme', theme);
    
    // Apply accent color - set CSS variables directly
    const accentColorMap = {
      blue: { color: '#3b82f6', hover: '#2563eb', light: '#60a5fa', rgb: '59, 130, 246' },
      purple: { color: '#a855f7', hover: '#9333ea', light: '#c084fc', rgb: '168, 85, 247' },
      green: { color: '#10b981', hover: '#059669', light: '#34d399', rgb: '16, 185, 129' },
      amber: { color: '#f59e0b', hover: '#d97706', light: '#fbbf24', rgb: '245, 158, 11' },
      red: { color: '#ef4444', hover: '#dc2626', light: '#f87171', rgb: '239, 68, 68' },
      cyan: { color: '#06b6d4', hover: '#0891b2', light: '#22d3ee', rgb: '6, 182, 212' }
    };
    
    const selectedColor = accentColorMap[accentColor] || accentColorMap.blue;
    root.style.setProperty('--accent-color', selectedColor.color);
    root.style.setProperty('--accent-hover', selectedColor.hover);
    root.style.setProperty('--accent-light', selectedColor.light);
    root.style.setProperty('--accent-color-rgb', selectedColor.rgb);
    root.setAttribute('data-accent', accentColor);
    
    // Apply font size to root
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px'
    };
    root.style.fontSize = fontSizeMap[fontSize] || '16px';
    
    // Apply high contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Apply reduce motion
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Apply font family to root
    const fontFamilyMap = {
      inter: "'Inter', sans-serif",
      outfit: "'Outfit', sans-serif",
      orbitron: "'Orbitron', sans-serif",
      serif: "'Times New Roman', Times, serif"
    };
    root.style.setProperty('--app-font-family', fontFamilyMap[fontFamily] || "'Inter', sans-serif");

  }, [theme, accentColor, fontSize, fontFamily, highContrast, reduceMotion]);

  // Sync settings with backend
  const syncWithBackend = useCallback(async (settingsUpdate) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings: settingsUpdate })
      });
    } catch (error) {
      console.error('Error syncing settings with backend:', error);
    }
  }, []);

  // Memoized update functions to prevent infinite re-renders
  const updateTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    syncWithBackend({ theme: newTheme });
  }, [syncWithBackend]);

  const updateAccentColor = useCallback((newColor) => {
    setAccentColor(newColor);
    localStorage.setItem('accentColor', newColor);
    syncWithBackend({ accentColor: newColor });
  }, [syncWithBackend]);

  const updateFontSize = useCallback((newSize) => {
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
    syncWithBackend({ fontSize: newSize });
  }, [syncWithBackend]);

  const updateFontFamily = useCallback((newFamily) => {
    setFontFamily(newFamily);
    localStorage.setItem('fontFamily', newFamily);
    syncWithBackend({ fontFamily: newFamily });
  }, [syncWithBackend]);

  const updateHighContrast = useCallback((value) => {
    setHighContrast(value);
    localStorage.setItem('highContrast', value);
    syncWithBackend({ highContrast: value });
  }, [syncWithBackend]);

  const updateReduceMotion = useCallback((value) => {
    setReduceMotion(value);
    localStorage.setItem('reduceMotion', value);
    syncWithBackend({ reduceMotion: value });
  }, [syncWithBackend]);

  const updateSoundEnabled = useCallback((value) => {
    setSoundEnabled(value);
    localStorage.setItem('soundEnabled', value);
    syncWithBackend({ soundEnabled: value });
  }, [syncWithBackend]);

  const updateAvatar = useCallback((value) => {
    setAvatar(value);
    localStorage.setItem('avatar', value);
    // Sync avatar separately (not in settings object)
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: value })
      }).catch(err => console.error('Error syncing avatar:', err));
    }
  }, []);

  const updateNickname = useCallback((value) => {
    setNickname(value);
    localStorage.setItem('nickname', value);
    // Sync nickname separately (not in settings object)
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nickname: value })
      }).catch(err => console.error('Error syncing nickname:', err));
    }
  }, []);

  const resetSettings = useCallback(() => {
    const defaultSettings = {
      theme: 'dark',
      accentColor: 'blue',
      fontSize: 'medium',
      fontFamily: 'inter',
      highContrast: false,
      reduceMotion: false,
      soundEnabled: true
    };

    setTheme('dark');
    setAccentColor('blue');
    setFontSize('medium');
    setFontFamily('inter');
    setHighContrast(false);
    setReduceMotion(false);
    setSoundEnabled(true);
    setAvatar(defaultAvatar);
    setNickname(defaultNickname);
    
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('accentColor', 'blue');
    localStorage.setItem('fontSize', 'medium');
    localStorage.setItem('fontFamily', 'inter');
    localStorage.setItem('highContrast', 'false');
    localStorage.setItem('reduceMotion', 'false');
    localStorage.setItem('soundEnabled', 'true');
    localStorage.setItem('avatar', defaultAvatar);
    localStorage.setItem('nickname', defaultNickname);

    // Sync all settings with backend
    syncWithBackend(defaultSettings);
    
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          avatar: defaultAvatar,
          nickname: defaultNickname
        })
      }).catch(err => console.error('Error syncing reset:', err));
    }
  }, [defaultAvatar, defaultNickname, syncWithBackend]);

  const value = {
    theme,
    accentColor,
    fontSize,
    fontFamily,
    highContrast,
    reduceMotion,
    soundEnabled,
    avatar,
    nickname,
    isLoaded,
    updateTheme,
    updateAccentColor,
    updateFontSize,
    updateFontFamily,
    updateHighContrast,
    updateReduceMotion,
    updateSoundEnabled,
    updateAvatar,
    updateNickname,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
