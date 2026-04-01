import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Palette, Eye, Monitor, Volume2, Moon, Sun, Type, Contrast, Sparkles, User, ShieldCheck, Camera } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ScrollButton } from '../components/ui/ScrollButton';
import FaceAuthModal from '../../../components/FaceAuthModal';
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
    username,
    twoFactorEnabled,
    twoFactorMethod,
    webauthnEnabled,
    faceRegistered,
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
    resetSettings,
    startWebAuthnRegistration,
    registerFace
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

  const [twoFactorMethodChoice, setTwoFactorMethodChoice] = useState(twoFactorMethod || 'totp');
  const [twoFactorSetupStarted, setTwoFactorSetupStarted] = useState(false);
  const [twoFactorQr, setTwoFactorQr] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStatus, setTwoFactorStatus] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  useEffect(() => {
    if (twoFactorMethod) {
      setTwoFactorMethodChoice(twoFactorMethod);
    }
  }, [twoFactorMethod]);

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

  const handleUsernameChange = (value) => {
    if (value.length <= 20) {
      updateUsername(value);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    const expected = `${username}/delete-account`;
    if (deleteConfirmation !== expected) {
      setDeleteError(`Please type "${expected}" to confirm.`);
      return;
    }

    try {
      setTwoFactorLoading(true);
      await deleteAccount(deleteConfirmation);
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete account');
      setTwoFactorLoading(false);
    }
  };

  const handleTwoFactorSetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorStatus('');
    setTwoFactorQr('');
    setTwoFactorSetupStarted(false);

    try {
      const data = await setupTwoFactor(twoFactorMethodChoice);
      setTwoFactorSetupStarted(true);

      if (data.qrCode) {
        setTwoFactorQr(data.qrCode);
      }

      setTwoFactorStatus(data.message || 'Setup started. Enter the code to verify.');
    } catch (error) {
      setTwoFactorStatus(error.message || '2FA setup failed');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleTwoFactorVerify = async () => {
    if (!twoFactorCode) {
      setTwoFactorStatus('Enter the 2FA code to continue.');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorStatus('');

    try {
      await verifyTwoFactorSetup(twoFactorMethodChoice, twoFactorCode);
      setTwoFactorStatus('2FA enabled successfully.');
      setTwoFactorCode('');
      setTwoFactorQr('');
      setTwoFactorSetupStarted(false);
    } catch (error) {
      setTwoFactorStatus(error.message || '2FA verification failed');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleTwoFactorDisable = async () => {
    setTwoFactorLoading(true);
    setTwoFactorStatus('');

    try {
      await disableTwoFactor();
      setTwoFactorStatus('2FA disabled.');
      setTwoFactorCode('');
      setTwoFactorQr('');
      setTwoFactorSetupStarted(false);
    } catch (error) {
      setTwoFactorStatus(error.message || '2FA disable failed');
    } finally {
      setTwoFactorLoading(false);
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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${theme === 'dark'
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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${theme === 'light'
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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${theme === 'auto'
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
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${accentColor === color.name
                      ? 'bg-slate-800 border-slate-600'
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${color.color} shadow-lg ${accentColor === color.name ? 'ring-2 ring-slate-400 ring-offset-2 ring-offset-slate-900' : ''
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
                    className={`px-4 py-3 rounded-lg border transition-all ${fontSize === size.value
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
                    className={`px-4 py-3 rounded-lg border transition-all ${fontFamily === family.value
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
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${highContrast ? 'translate-x-6' : ''
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
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${reduceMotion ? 'translate-x-6' : ''
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
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${soundEnabled ? 'translate-x-6' : ''
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
                <p className="text-sm text-slate-400">Customize your avatar and username</p>
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

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Username</label>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onFocus={() => playClick()}
                    placeholder="Enter your username"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500">{username.length}/20 characters</p>

                  {/* Preview */}
                  <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-3">Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-slate-600 overflow-hidden">
                        <img src={avatar} alt="Avatar preview" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{username || 'Commander'}</p>
                        <p className="text-xs text-slate-400">Your display name</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Security Section */}
        <div>
          <Card className="p-6 bg-slate-900/90 border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-900/20 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-100">Security</h2>
                <p className="text-sm text-slate-400">Enable two-factor authentication (2FA)</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-300">2FA Status</p>
                  <p className="text-xs text-slate-500">
                    {twoFactorEnabled ? `Enabled (${twoFactorMethod})` : 'Disabled'}
                  </p>
                </div>
                {twoFactorEnabled && (
                  <button
                    onClick={handleTwoFactorDisable}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                    disabled={twoFactorLoading}
                  >
                    Disable 2FA
                  </button>
                )}
              </div>

              {!twoFactorEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">Choose Method</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTwoFactorMethodChoice('totp')}
                        className={`flex-1 px-4 py-3 rounded-lg border transition-all ${twoFactorMethodChoice === 'totp'
                          ? 'bg-slate-800'
                          : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        style={twoFactorMethodChoice === 'totp' ? { borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : {}}
                      >
                        Authenticator App
                      </button>
                      <button
                        onClick={() => setTwoFactorMethodChoice('email')}
                        className={`flex-1 px-4 py-3 rounded-lg border transition-all ${twoFactorMethodChoice === 'email'
                          ? 'bg-slate-800'
                          : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        style={twoFactorMethodChoice === 'email' ? { borderColor: 'var(--accent-color)', color: 'var(--accent-color)' } : {}}
                      >
                        Email Code
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleTwoFactorSetup}
                    className="px-6 py-3 rounded-lg text-white font-semibold transition-all"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      boxShadow: '0 0 20px rgba(var(--accent-color-rgb), 0.4)'
                    }}
                    disabled={twoFactorLoading}
                  >
                    {twoFactorLoading ? 'Starting...' : 'Start 2FA Setup'}
                  </button>
                </>
              )}

              {!twoFactorEnabled && twoFactorSetupStarted && (
                <div className="space-y-4">
                  {twoFactorQr && (
                    <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                      <p className="text-xs text-slate-500 mb-3">Scan this QR code with your authenticator app</p>
                      <img src={twoFactorQr} alt="2FA QR code" className="w-44 h-44" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <button
                    onClick={handleTwoFactorVerify}
                    className="px-6 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 transition-all"
                    disabled={twoFactorLoading}
                  >
                    {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              )}

              {twoFactorStatus && (
                <p className="text-xs text-slate-400">{twoFactorStatus}</p>
              )}
            </div>
          </Card>
        </div>

        {/* Custom Face ID Section (Replacement for failed WebAuthn) */}
        <div>
          <Card className="p-6 bg-slate-900/90 border-slate-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-900/20 border border-purple-500/30 flex items-center justify-center">
                <Camera className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-100">Custom Face ID</h2>
                <p className="text-sm text-slate-400">Software-based facial recognition for your webcam</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-300">Facial Recognition</p>
                  <p className="text-xs text-slate-500">
                    {faceRegistered ? '✓ Face registered' : 'Not registered yet'}
                  </p>
                </div>
                <button
                  onClick={() => setIsFaceModalOpen(true)}
                  className="px-6 py-2 rounded-lg text-white font-semibold transition-all"
                  style={{
                    backgroundColor: '#7c3aed',
                    boxShadow: '0 0 15px rgba(124, 58, 237, 0.3)'
                  }}
                >
                  {faceRegistered ? 'Update Face Scan' : 'Register My Face'}
                </button>
              </div>
            </div>
          </Card>
        </div>

        <FaceAuthModal
          isOpen={isFaceModalOpen}
          onClose={() => setIsFaceModalOpen(false)}
          mode="register"
          onCapture={async (descriptor) => {
            try {
              setTwoFactorLoading(true);
              await registerFace(descriptor);
              playSuccess();
              setTwoFactorStatus('Face registered successfully!');
            } catch (err) {
              setTwoFactorStatus(err.message);
            } finally {
              setTwoFactorLoading(false);
            }
          }}
        />

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

        {/* Danger Zone */}
        <div className="mt-12">
          <Card className="p-6 bg-red-950/20 border-red-900/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-900/20 border border-red-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-red-500">Danger Zone</h2>
                <p className="text-sm text-red-400/70">Irreversible actions for your account</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg bg-red-950/30 border border-red-900/30 gap-4">
              <div>
                <h3 className="text-lg font-bold text-red-100">Delete Account</h3>
                <p className="text-sm text-red-400/80">Permanently remove your account and all associated data</p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-900/20"
              >
                Delete Account
              </button>
            </div>
          </Card>
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <Card className="w-full max-w-md p-6 bg-slate-900 border-red-900/50 shadow-2xl">
              <h3 className="text-2xl font-serif font-bold text-slate-100 mb-4">Are you absolutely sure?</h3>
              <p className="text-slate-400 mb-6">
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Please type <span className="font-mono text-red-400 font-bold">{username}/delete-account</span> to confirm.
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => {
                      setDeleteConfirmation(e.target.value);
                      setDeleteError('');
                    }}
                    placeholder="Type the confirmation string"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  {deleteError && <p className="mt-2 text-xs text-red-500">{deleteError}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeleteConfirmation('');
                      setDeleteError('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={twoFactorLoading}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {twoFactorLoading ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

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
