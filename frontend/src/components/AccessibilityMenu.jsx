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

    const toggleMenu = () => setIsOpen(!isOpen);

    const fontSizes = ['small', 'medium', 'large', 'xlarge'];
    const cycleFontSize = () => {
        const currentIndex = fontSizes.indexOf(fontSize);
        const nextIndex = (currentIndex + 1) % fontSizes.length;
        updateFontSize(fontSizes[nextIndex]);
    };

    const menuItems = [
        {
            icon: 'format_size',
            label: `Taille du texte (${fontSize})`,
            onClick: cycleFontSize,
            active: fontSize !== 'medium',
        },
        {
            icon: 'straighten',
            label: 'Guide de lecture',
            onClick: () => updateReadingGuide(!readingGuide),
            active: readingGuide,
        },
        {
            icon: 'contrast',
            label: 'Contraste élevé',
            onClick: () => updateHighContrast(!highContrast),
            active: highContrast,
        },
        {
            icon: 'filter_b_and_w',
            label: 'Noir et Blanc',
            onClick: () => updateMonochrome(!monochrome),
            active: monochrome,
        },
    ];

    return (
        <div className="fixed bottom-6 left-6 z-[10000] flex flex-col-reverse items-start gap-4">
            {/* Main toggle button */}
            <button
                onClick={toggleMenu}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-primary text-white rotate-90' : 'bg-surface-dark text-primary border-2 border-primary'
                    }`}
                title="Accessibilité"
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
