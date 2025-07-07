import React from 'react';
import logo from '../../public/images/B8Shield-Logotype 1.svg';

const LoaderOverlay = ({ isVisible = true }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#459CA8] to-[#EE7E31] transition-opacity duration-500 ease-out pointer-events-none ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Logo */}
      <img
        src={logo}
        alt="B8Shield logo"
        className="w-40 h-auto mb-6 animate-pulse"
      />
      {/* Subtle loading text */}
      <p className="text-white text-sm tracking-wide opacity-90">
        Loading…
      </p>
    </div>
  );
};

export default LoaderOverlay; 