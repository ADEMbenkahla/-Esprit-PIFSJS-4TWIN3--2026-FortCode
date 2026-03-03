import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function ScrollButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show button after scrolling down 300px
      setIsVisible(scrolled > 300);
      
      // Check if near bottom (within 100px)
      setIsAtBottom(windowHeight + scrolled >= documentHeight - 100);
    };

    window.addEventListener('scroll', toggleVisibility);
    toggleVisibility(); // Check initial state

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="group w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)]"
        aria-label="Scroll to top"
      >
        <ChevronUp className="w-6 h-6 group-hover:translate-y-[-2px] transition-transform" />
      </button>

      {/* Scroll to Bottom Button - Only show if not at bottom */}
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="group w-12 h-12 flex items-center justify-center rounded-full bg-slate-700 text-white shadow-lg hover:bg-slate-600 transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(100,116,139,0.6)]"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-6 h-6 group-hover:translate-y-[2px] transition-transform" />
        </button>
      )}
    </div>
  );
}
