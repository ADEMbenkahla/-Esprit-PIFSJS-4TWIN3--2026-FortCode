import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const AVATAR_STYLES = [
    { id: 'avataaars', name: 'Avatars' },
    { id: 'bottts', name: 'Robots' },
    { id: 'pixel-art', name: 'Pixel Art' },
    { id: 'adventure', name: 'Adventure' },
    { id: 'big-smile', name: 'Big Smile' },
    { id: 'lorelei', name: 'Lorelei' },
    { id: 'notionists', name: 'Notionists' },
    { id: 'open-peeps', name: 'Peeps' },
    { id: 'croodles', name: 'Croodles' },
    { id: 'personas', name: 'Personas' }
];

export const AvatarPicker = ({ currentAvatar, onSelect }) => {
    const [style, setStyle] = useState('avataaars');
    const [seed, setSeed] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize from currentAvatar or random
    useEffect(() => {
        if (!isInitialized) {
            if (currentAvatar && currentAvatar.includes('dicebear.com')) {
                try {
                    // Extract style and seed from DiceBear URL
                    // https://api.dicebear.com/9.x/{style}/svg?seed={seed}
                    const parts = currentAvatar.split('/');
                    const stylePart = parts[parts.indexOf('9.x') + 1];
                    const seedMatch = currentAvatar.match(/seed=([^&]+)/);
                    if (stylePart && seedMatch) {
                        setStyle(stylePart);
                        setSeed(decodeURIComponent(seedMatch[1]));
                    } else {
                        setSeed(Math.random().toString(36).substring(7));
                    }
                } catch (e) {
                    setSeed(Math.random().toString(36).substring(7));
                }
            } else {
                setSeed(Math.random().toString(36).substring(7));
            }
            setIsInitialized(true);
        }
    }, [currentAvatar, isInitialized]);

    useEffect(() => {
        if (isInitialized && style && seed) {
            const url = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
            setPreviewUrl(url);
            // Call onSelect with debounce to avoid too many calls
            const timer = setTimeout(() => {
                onSelect(url);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [style, seed, isInitialized, onSelect]);

    const randomize = () => {
        setSeed(Math.random().toString(36).substring(7));
    };

    return (
        <div className="flex flex-col gap-6 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
            {/* Preview Section */}
            <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 overflow-hidden bg-slate-900 shadow-2xl transition-transform group-hover:scale-105">
                        {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />}
                    </div>
                    <button
                        type="button"
                        onClick={randomize}
                        className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-colors active:scale-95"
                        title="Randomize Seed"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">Seed: {seed}</p>
            </div>

            {/* Style Selector */}
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {AVATAR_STYLES.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setStyle(s.id)}
                        className={`px-3 py-2 text-[10px] uppercase font-bold tracking-widest rounded-xl border transition-all duration-200 ${style === s.id
                            ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                            }`}
                    >
                        {s.name}
                    </button>
                ))}
            </div>
        </div>
    );
};
