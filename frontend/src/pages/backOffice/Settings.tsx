import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Camera, User, Sparkles, ShieldCheck } from 'lucide-react';
import { AvatarPicker } from './components/AvatarPicker';
import { useSettings } from '../../context/SettingsContext';
import FaceAuthModal from '../../components/FaceAuthModal';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import Swal from 'sweetalert2';

const Settings: React.FC = () => {
    const {
        username,
        avatar,
        faceRegistered,
        updateUsername,
        updateAvatar,
        registerFace
    } = useSettings();

    const { playClick, playSuccess } = useSoundEffects();
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [tempUsername, setTempUsername] = useState(username);

    const handleUsernameUpdate = async () => {
        if (!tempUsername || tempUsername === username) return;

        try {
            playClick();
            await updateUsername(tempUsername);
            Swal.fire({
                title: 'Success!',
                text: 'Username updated successfully',
                icon: 'success',
                background: '#1a1a2e',
                color: '#fff',
                confirmButtonColor: '#7c3aed'
            });
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to update username',
                icon: 'error',
                background: '#1a1a2e',
                color: '#fff'
            });
        }
    };

    const handleAvatarSelect = (url: string) => {
        if (url !== avatar) {
            updateAvatar(url);
        }
    };

    return (
        <div className="flex h-screen bg-background-dark font-body text-gray-200 overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 relative">
                <Header
                    title="Account Settings"
                    subtitle="Manage your profile and security preferences"
                />

                <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Profile Section */}
                        <section className="bg-surface-dark rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />

                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="material-icons-outlined text-primary text-lg">person</span>
                                Profile Information
                            </h3>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Avatar Selection */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Choose Avatar</label>
                                    <AvatarPicker currentAvatar={avatar} onSelect={handleAvatarSelect} />
                                </div>

                                {/* Username Section */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Username</label>
                                        <div className="relative group/input">
                                            <input
                                                type="text"
                                                value={tempUsername}
                                                onChange={(e) => setTempUsername(e.target.value)}
                                                className="w-full bg-background-dark/50 border border-purple-900/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all group-hover/input:border-purple-600/50"
                                                placeholder="Enter username"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-mono">
                                                {tempUsername.length}/20
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleUsernameUpdate}
                                            disabled={!tempUsername || tempUsername === username}
                                            className="w-full py-3 px-6 bg-gradient-to-r from-primary to-accent-purple text-white font-bold rounded-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            Save Changes
                                        </button>
                                    </div>

                                    {/* Small Preview Box */}
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-primary/30 overflow-hidden bg-surface-dark">
                                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{username}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Display Identity</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Security & Face ID Section */}
                        <section className="bg-surface-dark rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden group">
                            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-accent-purple/10 rounded-full blur-3xl group-hover:bg-accent-purple/20 transition-colors duration-500" />

                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                <span className="material-icons-outlined text-primary text-lg">security</span>
                                Security & Authentication
                            </h3>

                            <div className="p-6 rounded-2xl bg-background-dark/50 border border-purple-900/10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <Camera className="w-7 h-7 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold">Facial Recognition (Face ID)</h4>
                                        <p className="text-xs text-gray-500 max-w-md mt-1">
                                            Enhance your account security using software-based facial recognition. This allows you to login using your webcam.
                                        </p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className={`w-2 h-2 rounded-full ${faceRegistered ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                {faceRegistered ? 'Active & Secure' : 'Not Configured'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsFaceModalOpen(true)}
                                    className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    <span className="material-icons-outlined text-lg">{faceRegistered ? 'refresh' : 'add_a_photo'}</span>
                                    {faceRegistered ? 'Update Face Scan' : 'Register My Face'}
                                </button>
                            </div>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                        <p className="text-xs font-bold text-gray-300">Biometric Security</p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                        Your facial biometric data is processed locally as vectors (descriptors) and stored securely on our servers for authentication matching.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <p className="text-xs font-bold text-gray-300">Fast Access</p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                        Once registered, you can bypass traditional password entry by simply looking at your camera during the login process.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="pt-6 flex justify-center">
                            <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-bold">FortCode Security Systems • v2.0</p>
                        </div>
                    </div>
                </div>
            </main>

            <FaceAuthModal
                isOpen={isFaceModalOpen}
                onClose={() => setIsFaceModalOpen(false)}
                mode="register"
                onCapture={async (descriptor) => {
                    try {
                        setLoading(true);
                        await registerFace(descriptor);
                        playSuccess();
                        Swal.fire({
                            title: 'Registered!',
                            text: 'Your face has been successfully linked to your account.',
                            icon: 'success',
                            background: '#1a1a2e',
                            color: '#fff',
                            confirmButtonColor: '#7c3aed'
                        });
                        setIsFaceModalOpen(false);
                    } catch (err: any) {
                        Swal.fire({
                            title: 'Error',
                            text: err.message || 'Face registration failed',
                            icon: 'error',
                            background: '#1a1a2e',
                            color: '#fff'
                        });
                    } finally {
                        setLoading(false);
                    }
                }}
            />
        </div>
    );
};

export default Settings;
