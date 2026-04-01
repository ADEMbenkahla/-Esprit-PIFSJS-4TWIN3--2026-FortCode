import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem('accessibility-position');
        return saved ? JSON.parse(saved) : { x: 24, y: window.innerHeight - 80 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false });
    const menuRef = useRef(null);

    // Pre-fetch voices to ensure they are ready when needed
    useEffect(() => {
        const synth = window.speechSynthesis;
        const loadVoices = () => {
            synth.getVoices();
        };
        loadVoices();
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = loadVoices;
        }
    }, []);

    const toggleMenu = useCallback((e) => {
        if (!dragRef.current.moved) {
            setIsOpen(prev => !prev);
        }
    }, []);

    const handleSpeech = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        window.speechSynthesis.cancel();
        const text = "Welcome to FortCode. This platform is designed for learning and mastering programming through interactive challenges, battle arenas, and collaborative coding rooms. Use this accessibility menu to customize your reading and navigation experience.";
        const utterance = new SpeechSynthesisUtterance(text);

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

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const fontSizes = ['small', 'medium', 'large', 'xlarge'];
    const cycleFontSize = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        const nextIndex = (currentIndex + 1) % fontSizes.length;
        updateFontSize(fontSizes[nextIndex]);
    };

    // DRAG LOGIC
    const handleStart = (e) => {
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        setIsDragging(true);
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialX: position.x,
            initialY: position.y,
            moved: false
        };
    };

    const handleMove = useCallback((e) => {
        if (!isDragging) return;

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const dx = clientX - dragRef.current.startX;
        const dy = clientY - dragRef.current.startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            dragRef.current.moved = true;
        }

        const newX = Math.max(10, Math.min(window.innerWidth - 70, dragRef.current.initialX + dx));
        const newY = Math.max(10, Math.min(window.innerHeight - 70, dragRef.current.initialY + dy));

        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleEnd = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            localStorage.setItem('accessibility-position', JSON.stringify(position));
        }
    }, [isDragging, position]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, handleMove, handleEnd]);

    const menuItems = [
        { icon: 'format_size', label: `Text Size (${fontSize})`, onClick: cycleFontSize, active: fontSize !== 'medium' },
        { icon: 'straighten', label: 'Reading Guide', onClick: () => updateReadingGuide(!readingGuide), active: readingGuide },
        { icon: 'contrast', label: 'High Contrast', onClick: () => updateHighContrast(!highContrast), active: highContrast },
        { icon: 'filter_b_and_w', label: 'Monochrome', onClick: () => updateMonochrome(!monochrome), active: monochrome },
        { icon: isSpeaking ? 'volume_off' : 'record_voice_over', label: isSpeaking ? 'Stop Description' : 'Audio Description', onClick: handleSpeech, active: isSpeaking },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed z-[10000] flex flex-col-reverse items-start gap-4"
            style={{ left: position.x, top: position.y, transform: 'translateY(-100%)', flexFlow: 'column' }}
        >
            {/* Main toggle button */}
            <button
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                onClick={toggleMenu}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 transform hover:scale-110 active:scale-95 cursor-move ${isOpen ? 'bg-primary text-white rotate-90' : 'bg-surface-dark text-primary border-2 border-primary'
                    }`}
                title="Hold to drag, click to open"
            >
                <span className="material-icons-outlined text-3xl pointer-events-none">
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
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 active:scale-90 ${item.active ? 'bg-primary text-white' : 'bg-surface-dark text-white hover:bg-gray-700'
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
