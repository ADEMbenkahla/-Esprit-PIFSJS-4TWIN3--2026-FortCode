import React, { useState, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';

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

interface AvatarPickerProps {
    currentAvatar?: string;
    onSelect: (url: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ currentAvatar, onSelect }) => {
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
        }
    }, [style, seed, isInitialized]);

    useEffect(() => {
        if (previewUrl) {
            onSelect(previewUrl);
        }
    }, [previewUrl, onSelect]);

    const randomize = () => {
        setSeed(Math.random().toString(36).substring(7));
    };

    return (
        <div className="flex flex-col gap-6 p-4 bg-background-dark/50 border border-purple-900/20 rounded-2xl">
            {/* Preview Section */}
            <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/30 overflow-hidden bg-surface-dark shadow-2xl transition-transform group-hover:scale-105">
                        {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />}
                    </div>
                    <button
                        type="button"
                        onClick={randomize}
                        className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-colors active:scale-95"
                        title="Randomize Seed"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 font-mono">Seed: {seed}</p>
            </div>

            {/* Style Selector */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {AVATAR_STYLES.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setStyle(s.id)}
                        className={`px-3 py-2 text-[10px] uppercase font-bold tracking-widest rounded-xl border transition-all duration-200 ${style === s.id
                            ? 'bg-primary border-primary text-white shadow-glow'
                            : 'bg-surface-dark/50 border-purple-900/20 text-gray-400 hover:border-purple-700/50 hover:text-white'
                            }`}
                    >
                        {s.name}
                    </button>
                ))}
            </div>
        </div>
    );
};
