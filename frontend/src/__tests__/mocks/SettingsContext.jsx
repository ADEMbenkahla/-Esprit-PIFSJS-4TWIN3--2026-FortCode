import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [avatar] = useState('https://example.com/avatar.png');
  const [nickname] = useState('TestPlayer');
  const [fontSize] = useState('medium');
  const [highContrast] = useState(false);
  const [readingGuide] = useState(false);
  const [readOnHover] = useState(false);
  const [monochrome] = useState(false);

  return (
    <SettingsContext.Provider
      value={{
        avatar,
        nickname,
        fontSize,
        highContrast,
        readingGuide,
        readOnHover,
        monochrome,
        updateFontSize: () => {},
        updateHighContrast: () => {},
        updateReadingGuide: () => {},
        updateReadOnHover: () => {},
        updateMonochrome: () => {},
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};