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
  const defaultUsername = 'Commander';
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
  const [username, setUsername] = useState(localStorage.getItem('username') || defaultUsername);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState('totp');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load all settings from backend
  const loadUserSettings = useCallback(async () => {
    try {
      // Try sessionStorage first (current tab), then localStorage (fallback)
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
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
        setUsername(defaultUsername);
        setTwoFactorEnabled(false);
        setTwoFactorMethod('totp');
        setIsLoaded(true);
        return;
      }

      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // fast load username and ID if available
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.username) {
          setUsername(payload.username);
        }
      } catch (e) { }

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

          if (user.settings.twoFactor) {
            setTwoFactorEnabled(!!user.settings.twoFactor.enabled);
            setTwoFactorMethod(user.settings.twoFactor.method || 'totp');
          }

          // Update localStorage cache
          localStorage.setItem('theme', nextTheme);
          localStorage.setItem('accentColor', user.settings.accentColor || 'blue');
          localStorage.setItem('fontSize', user.settings.fontSize || 'medium');
          localStorage.setItem('fontFamily', user.settings.fontFamily || 'inter');
          localStorage.setItem('highContrast', user.settings.highContrast || false);
          localStorage.setItem('reduceMotion', user.settings.reduceMotion || false);
          localStorage.setItem('soundEnabled', user.settings.soundEnabled !== false);
        }

        // Load avatar and username (USER-SPECIFIC)
        if (user.avatar) {
          setAvatar(user.avatar);
          localStorage.setItem('avatar', user.avatar);
        }
        if (user.username) {
          setUsername(user.username);
          localStorage.setItem('username', user.username);
        }
      } else {
        // Invalid token or server error, reset local state
        setAvatar(defaultAvatar);
        setUsername(defaultUsername);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [defaultAvatar, defaultUsername]);

  useEffect(() => {
    loadUserSettings();

    // Listen for token changes to refresh settings immediately
    window.addEventListener('tokenChanged', loadUserSettings);
    return () => window.removeEventListener('tokenChanged', loadUserSettings);
  }, [loadUserSettings]);

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
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
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

  const setupTwoFactor = useCallback(async (method) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('http://localhost:5000/api/auth/2fa/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ method })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '2FA setup failed');
    }

    setTwoFactorMethod(method || 'totp');
    return data;
  }, []);

  const verifyTwoFactorSetup = useCallback(async (method, code) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('http://localhost:5000/api/auth/2fa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ method, code })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '2FA verification failed');
    }

    setTwoFactorEnabled(true);
    setTwoFactorMethod(method || 'totp');
    return data;
  }, []);

  const disableTwoFactor = useCallback(async () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('http://localhost:5000/api/auth/2fa/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || '2FA disable failed');
    }

    setTwoFactorEnabled(false);
    return data;
  }, []);

  const updateAvatar = useCallback((value) => {
    setAvatar(value);
    localStorage.setItem('avatar', value);
    // Sync avatar separately (not in settings object)
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
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

  const updateUsername = useCallback((value) => {
    setUsername(value);
    localStorage.setItem('username', value);
    // Sync username separately (not in settings object)
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: value })
      }).catch(err => console.error('Error syncing username:', err));
    }
  }, []);

  const deleteAccount = useCallback(async (confirmation) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');

    const response = await fetch('http://localhost:5000/api/auth/profile', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ confirmation })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Account deletion failed');
    }

    // Logout after deletion
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/';
    return data;
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
    setUsername(defaultUsername);

    localStorage.setItem('theme', 'dark');
    localStorage.setItem('accentColor', 'blue');
    localStorage.setItem('fontSize', 'medium');
    localStorage.setItem('fontFamily', 'inter');
    localStorage.setItem('highContrast', 'false');
    localStorage.setItem('reduceMotion', 'false');
    localStorage.setItem('soundEnabled', 'true');
    localStorage.setItem('avatar', defaultAvatar);
    localStorage.setItem('username', defaultUsername);

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
          username: defaultUsername
        })
      }).catch(err => console.error('Error syncing reset:', err));
    }
  }, [defaultAvatar, defaultUsername, syncWithBackend]);

  const value = {
    theme,
    accentColor,
    fontSize,
    fontFamily,
    highContrast,
    reduceMotion,
    soundEnabled,
    avatar,
    username,
    nickname: username, // Backward compatibility
    twoFactorEnabled,
    twoFactorMethod,
    isLoaded,
    updateTheme,
    updateAccentColor,
    updateFontSize,
    updateFontFamily,
    updateHighContrast,
    updateReduceMotion,
    updateSoundEnabled,
    setupTwoFactor,
    verifyTwoFactorSetup,
    disableTwoFactor,
    updateAvatar,
    updateUsername,
    deleteAccount,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
