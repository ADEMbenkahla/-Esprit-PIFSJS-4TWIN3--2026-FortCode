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
        readOnHover,
        updateReadOnHover,
        monochrome,
        updateMonochrome
    } = useSettings();
    const [position, setPosition] = useState(() => {
        const fallback = {
            x: 20,
            y: typeof window !== 'undefined' ? window.innerHeight - 20 : 20
        };

        try {
            const saved = localStorage.getItem('accessibility-position');
            if (!saved) {
                return fallback;
            }

            const parsed = JSON.parse(saved);
            if (
                parsed &&
                typeof parsed.x === 'number' &&
                typeof parsed.y === 'number'
            ) {
                return parsed;
            }
        } catch {
            localStorage.removeItem('accessibility-position');
        }

        return fallback;
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false });
    const menuRef = useRef(null);
    const lastReadRef = useRef(null);
    const speechTimeoutRef = useRef(null);

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

    // READ ON HOVER LOGIC
    useEffect(() => {
        if (!readOnHover) {
            window.speechSynthesis.cancel();
            return;
        }

        const handleMouseMove = (e) => {
            const element = document.elementFromPoint(e.clientX, e.clientY);
            if (!element) return;

            // Only read certain elements to avoid noise
            const validTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'BUTTON', 'LI', 'LABEL', 'A', 'CODE'];
            const target = element.closest(validTags.join(','));

            if (target && target.innerText && target !== lastReadRef.current) {
                const text = target.innerText.trim();
                if (text && text.length > 1) {
                    clearTimeout(speechTimeoutRef.current);
                    speechTimeoutRef.current = setTimeout(() => {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.rate = 1.1;
                        utterance.pitch = 1;

                        const voices = window.speechSynthesis.getVoices();
                        const englishVoice = voices.find(v => v.lang.startsWith('en'));
                        if (englishVoice) utterance.voice = englishVoice;

                        window.speechSynthesis.speak(utterance);
                        lastReadRef.current = target;
                    }, 150); // Small delay to avoid staccato while moving fast
                }
            } else if (!target) {
                lastReadRef.current = null;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(speechTimeoutRef.current);
        };
    }, [readOnHover]);

    const menuItems = [
        { icon: 'format_size', label: `Text Size (${fontSize})`, onClick: cycleFontSize, active: fontSize !== 'medium' },
        { icon: 'straighten', label: 'Reading Guide', onClick: () => updateReadingGuide(!readingGuide), active: readingGuide },
        { icon: 'contrast', label: 'High Contrast', onClick: () => updateHighContrast(!highContrast), active: highContrast },
        { icon: 'filter_b_and_w', label: 'Monochrome', onClick: () => updateMonochrome(!monochrome), active: monochrome },
        { icon: readOnHover ? 'volume_off' : 'record_voice_over', label: readOnHover ? 'Stop Description' : 'Audio Description', onClick: () => updateReadOnHover(!readOnHover), active: readOnHover },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed z-[10000] flex flex-col-reverse items-start gap-4"
            style={{ left: position.x, top: position.y, transform: 'translateY(-100%)' }}
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
                <span aria-hidden="true" className="material-icons-outlined text-3xl pointer-events-none">
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
                            <span aria-hidden="true" className="material-icons-outlined">{item.icon}</span>
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
