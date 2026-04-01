import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

const AccessibilityMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const {
        fontSize,
        updateFontSize,
        highContrast,
        updateHighContrast,
        readingGuide,
        updateReadingGuide,
        monochrome,
        updateMonochrome
    } = useSettings();

    const [isSpeaking, setIsSpeaking] = useState(false);

    // Pre-fetch voices to ensure they are ready when needed
    React.useEffect(() => {
        const synth = window.speechSynthesis;
        const loadVoices = () => {
            synth.getVoices();
        };
        loadVoices();
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = loadVoices;
        }
    }, []);

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleSpeech = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        // Prepare speech
        window.speechSynthesis.cancel(); // Safety first

        const text = "Welcome to FortCode. This platform is designed for learning and mastering programming through interactive challenges, battle arenas, and collaborative coding rooms. Use this accessibility menu to customize your reading and navigation experience.";
        const utterance = new SpeechSynthesisUtterance(text);

        // Find an English voice if available
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
            utterance.voice = englishVoice;
        } else {
            utterance.lang = 'en-US';
        }

        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            console.log("Speech started");
            setIsSpeaking(true);
        };
        utterance.onend = () => {
            console.log("Speech ended");
            setIsSpeaking(false);
        };
        utterance.onerror = (e) => {
            console.error("Speech error:", e);
            setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
    };

    const fontSizes = ['small', 'medium', 'large', 'xlarge'];
    const cycleFontSize = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        const nextIndex = (currentIndex + 1) % fontSizes.length;
        updateFontSize(fontSizes[nextIndex]);
    };

    const menuItems = [
        {
            icon: 'format_size',
            label: `Text Size (${fontSize})`,
            onClick: cycleFontSize,
            active: fontSize !== 'medium',
        },
        {
            icon: 'straighten',
            label: 'Reading Guide',
            onClick: () => updateReadingGuide(!readingGuide),
            active: readingGuide,
        },
        {
            icon: 'contrast',
            label: 'High Contrast',
            onClick: () => updateHighContrast(!highContrast),
            active: highContrast,
        },
        {
            icon: 'filter_b_and_w',
            label: 'Monochrome',
            onClick: () => updateMonochrome(!monochrome),
            active: monochrome,
        },
        {
            icon: isSpeaking ? 'volume_off' : 'record_voice_over',
            label: isSpeaking ? 'Stop Description' : 'Audio Description',
            onClick: handleSpeech,
            active: isSpeaking,
        },
    ];

    return (
        <div className="fixed bottom-6 left-6 z-[10000] flex flex-col-reverse items-start gap-4">
            {/* Main toggle button */}
            <button
                onClick={toggleMenu}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-primary text-white rotate-90' : 'bg-surface-dark text-primary border-2 border-primary'
                    }`}
                title="Accessibility"
            >
                <span className="material-icons-outlined text-3xl">
                    {isOpen ? 'close' : 'accessibility_new'}
                </span>
            </button>

            {/* Expanded Menu Icons */}
            <div
                className={`flex flex-col gap-3 transition-all duration-300 origin-bottom ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-0 translate-y-10 pointer-events-none'
                    }`}
            >
                {menuItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 group">
                        <button
                            onClick={item.onClick}
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-90 ${item.active
                                ? 'bg-primary text-white'
                                : 'bg-surface-dark text-white hover:bg-gray-700'
                                }`}
                            title={item.label}
                        >
                            <span className="material-icons-outlined">{item.icon}</span>
                        </button>
                        <span className="px-3 py-1 bg-surface-dark text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-sm border border-gray-700">
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AccessibilityMenu;
