import React from 'react';
import { Settings as SettingsIcon, Palette, Eye, Monitor, Volume2, Moon, Sun, Type, Contrast, Sparkles, User } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ScrollButton } from '../components/ui/ScrollButton';
import { useSettings } from '../../../context/SettingsContext';
import { useSoundEffects } from '../../../hooks/useSoundEffects';
import { AvatarPicker } from '../components/layout/AvatarPicker';

export default function Settings() {
  const {
    theme,
    accentColor,
    fontSize,
    fontFamily,
    highContrast,
    reduceMotion,
    soundEnabled,
    avatar,
    nickname,
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
  } = useSettings();

  const { playClick, playToggle, playSelect, playSuccess } = useSoundEffects();

  const accentColors = [
    { name: 'blue', color: 'bg-blue-500', label: 'Blue' },
    { name: 'purple', color: 'bg-purple-500', label: 'Purple' },
    { name: 'green', color: 'bg-green-500', label: 'Green' },
    { name: 'amber', color: 'bg-amber-500', label: 'Amber' },
    { name: 'red', color: 'bg-red-500', label: 'Red' },
    { name: 'cyan', color: 'bg-cyan-500', label: 'Cyan' },
  ];

  const fontSizes = [
    { value: 'small', label: 'Small', size: 'text-sm' },
    { value: 'medium', label: 'Medium', size: 'text-base' },
    { value: 'large', label: 'Large', size: 'text-lg' },
    { value: 'xlarge', label: 'Extra Large', size: 'text-xl' },
  ];

  const fontFamilies = [
    { value: 'inter', label: 'Inter', fontFamily: "'Inter', sans-serif" },
    { value: 'outfit', label: 'Outfit', fontFamily: "'Outfit', sans-serif" },
    { value: 'orbitron', label: 'Orbitron', fontFamily: "'Orbitron', sans-serif" },
    { value: 'serif', label: 'Serif', fontFamily: "'Times New Roman', Times, serif" }
  ];

  const handleThemeChange = (newTheme) => {
    playSelect();
    updateTheme(newTheme);
  };

  const handleAccentColorChange = (color) => {
    playSelect();
    updateAccentColor(color);
  };

  const handleFontSizeChange = (size) => {
    playSelect();
    updateFontSize(size);
  };

  const handleFontFamilyChange = (family) => {
    playSelect();
    updateFontFamily(family);
  };

  const handleToggle = (setter, value) => {
    playToggle();
    setter(!value);
  };

  const handleReset = () => {
    playSuccess();
    resetSettings();
  };

  const handleAvatarChange = (url) => {
    playSelect();
    updateAvatar(url);
  };

  const handleNicknameChange = (value) => {
    if (value.length <= 20) {
      updateNickname(value);
    }
  };

  return (
    <div className="min-h-screen pt-24 p-8 bg-slate-950 relative">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-slate-100 mb-2 flex items-center gap-3">
            <SettingsIcon className="w-10 h-10" style={{ color: 'var(--accent-color)' }} />
            Settings
          </h1>
          <p className="text-slate-400">Customize your FortCode experience - Changes apply instantly to all pages</p>
        </div>

        {/* Theme Customization */}
        <div>
          <Card className="p-6 bg-slate-900/90 border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-900/20 border border-purple-500/30 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-100">Theme</h2>
                <p className="text-sm text-slate-400">Personalize your visual experience</p>
              </div>
            </div>

            {/* Theme Mode */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Theme Mode</label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  style={theme === 'dark' ? { borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : {}}
                >
                  <Moon className="w-5 h-5" />
                  <span>Dark</span>
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    theme === 'light'
                      ? 'bg-slate-800'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  style={theme === 'light' ? { borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : {}}
                >
                  <Sun className="w-5 h-5" />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => handleThemeChange('auto')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    theme === 'auto'
                      ? 'bg-slate-800'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  style={theme === 'auto' ? { borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : {}}
                >
                  <Monitor className="w-5 h-5" />
                  <span>Auto</span>
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Accent Color</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {accentColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleAccentColorChange(color.name)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                      accentColor === color.name
                        ? 'bg-slate-800 border-slate-600'
                        : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${color.color} shadow-lg ${
                      accentColor === color.name ? 'ring-2 ring-slate-400 ring-offset-2 ring-offset-slate-900' : ''
                    }`} />
                    <span className="text-xs text-slate-400">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Accessibility Settings */}
        <div>
          <Card className="p-6 bg-slate-900/90 border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-900/20 border border-green-500/30 flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-100">Accessibility</h2>
                <p className="text-sm text-slate-400">Make FortCode work better for you</p>
              </div>
            </div>

            {/* Font Size */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                <Type className="w-4 h-4 inline mr-2" />
                Font Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {fontSizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => handleFontSizeChange(size.value)}
                    className={`px-4 py-3 rounded-lg border transition-all ${
                      fontSize === size.value
                        ? 'bg-slate-800'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                    style={fontSize === size.value ? { borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : {}}
                  >
                    <span className={size.size}>{size.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                <Type className="w-4 h-4 inline mr-2" />
                Font Family
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {fontFamilies.map((family) => (
                  <button
                    key={family.value}
                    onClick={() => handleFontFamilyChange(family.value)}
                    className={`px-4 py-3 rounded-lg border transition-all ${
                      fontFamily === family.value
                        ? 'bg-slate-800'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                    style={fontFamily === family.value ? { borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : {}}
                  >
                    <span style={{ fontFamily: family.fontFamily }}>{family.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Settings */}
            <div className="space-y-4">
              {/* High Contrast */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Contrast className="w-5 h-5 text-slate-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300">High Contrast</h3>
                    <p className="text-xs text-slate-500">Increase contrast for better readability</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(updateHighContrast, highContrast)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: highContrast ? 'var(--accent-color)' : '#334155' }}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    highContrast ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              {/* Reduce Motion */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-slate-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300">Reduce Motion</h3>
                    <p className="text-xs text-slate-500">Minimize animations and transitions</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(updateReduceMotion, reduceMotion)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: reduceMotion ? 'var(--accent-color)' : '#334155' }}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    reduceMotion ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-slate-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300">Sound Effects</h3>
                    <p className="text-xs text-slate-500">Enable UI sound effects</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(updateSoundEnabled, soundEnabled)}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: soundEnabled ? 'var(--accent-color)' : '#334155' }}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    soundEnabled ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Section */}
        <div>
          <Card className="p-6 bg-slate-900/90 border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-900/20 border border-blue-500/30 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-100">Profile</h2>
                <p className="text-sm text-slate-400">Customize your avatar and nickname</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Avatar Picker */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Avatar</label>
                <AvatarPicker 
                  currentAvatar={avatar}
                  onSelect={handleAvatarChange}
                />
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Nickname</label>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => handleNicknameChange(e.target.value)}
                    onFocus={() => playClick()}
                    placeholder="Enter your nickname"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500">{nickname.length}/20 characters</p>
                  
                  {/* Preview */}
                  <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-3">Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-600 overflow-hidden">
                        <img src={avatar} alt="Avatar preview" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{nickname || 'Commander'}</p>
                        <p className="text-xs text-slate-400">Your display name</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Card */}
        <div>
          <Card className="p-6 bg-slate-900/50 border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-color)' }} />
              <h3 className="text-xl font-semibold text-slate-100">Live Preview</h3>
            </div>
            <div className="space-y-4">
              <div 
                className="p-4 rounded-lg border-2 bg-slate-950/50"
                style={{ borderColor: 'var(--accent-color)' }}
              >
                <p className="text-slate-300 mb-2">
                  <strong style={{ color: 'var(--accent-color)' }}>Accent Color:</strong> {accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}
                </p>
                <p className="text-slate-300 mb-2">
                  <strong style={{ color: 'var(--accent-color)' }}>Font Size:</strong> {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
                </p>
                <p className="text-slate-300 mb-2">
                  <strong style={{ color: 'var(--accent-color)' }}>Theme:</strong> {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </p>
                <p className="text-slate-300">
                  This preview shows your customized settings in action. The accent color is used for highlights, borders, and interactive elements throughout the application.
                </p>
              </div>
              <button 
                className="px-6 py-3 rounded-lg text-white font-semibold transition-all"
                style={{
                  backgroundColor: 'var(--accent-color)',
                  boxShadow: '0 0 20px rgba(var(--accent-color-rgb), 0.4)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--accent-hover)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--accent-color)'}
              >
                Example Button with Accent Color
              </button>
            </div>
          </Card>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center pb-8">
          <button
            onClick={handleReset}
            className="px-6 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 transition-all"
          >
            Reset to Default Settings
          </button>
        </div>
      </div>

      <ScrollButton />
    </div>
  );
}
