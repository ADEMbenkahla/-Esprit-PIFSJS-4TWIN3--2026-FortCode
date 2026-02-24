import React from 'react';
import { useSidebar } from '../../../context/SidebarContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

const Header: React.FC<HeaderProps> = ({
  title = "User Tracker",
  subtitle = "Manage and monitor platform participants",
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search anything..."
}) => {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="bg-surface-dark/80 backdrop-blur-md border-b border-purple-900/20 h-20 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-purple-900/20 transition-colors"
        >
          <span className="material-icons-outlined">menu</span>
        </button>
        <div className="flex flex-col">
          <h1 className="font-display font-bold text-lg md:text-2xl text-white tracking-wide">{title}</h1>
          <p className="text-[10px] md:text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden md:block">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons-outlined text-gray-500 text-lg">search</span>
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 pr-4 py-2 w-48 lg:w-64 bg-background-dark/50 border border-purple-900/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-600"
          />
        </div>

        <button className="relative p-2 rounded-lg text-gray-400 hover:bg-purple-900/20 transition-colors">
          <span className="material-icons-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
