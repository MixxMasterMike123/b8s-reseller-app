import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useDarkMode } from '../hooks/useDarkMode';

/**
 * Dark Mode Toggle Switch Component
 * Displays a sleek toggle with sun/moon icons
 */
const DarkModeToggle = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative inline-flex h-8 w-14 items-center rounded-full
        transition-colors duration-300 ease-in-out
        ${isDarkMode 
          ? 'bg-blue-600 hover:bg-blue-700' 
          : 'bg-gray-300 hover:bg-gray-400'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-800
        ${className}
      `}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Toggle Circle */}
      <span
        className={`
          inline-block h-6 w-6 transform rounded-full
          bg-white shadow-lg transition-transform duration-300 ease-in-out
          flex items-center justify-center
          ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}
        `}
      >
        {/* Icon */}
        {isDarkMode ? (
          <MoonIcon className="h-3 w-3 text-blue-600" />
        ) : (
          <SunIcon className="h-3 w-3 text-yellow-500" />
        )}
      </span>
    </button>
  );
};

export default DarkModeToggle;