import React from 'react';
import mark from '../../public/images/app-mark.svg';

// Full-screen loading overlay shown during initial app load + account fetch.
// Brand-neutral: a generic placeholder mark on a neutral dark gradient (no
// per-shop logo/colors). Swap public/images/app-mark.svg for real brand art
// later, or drive this from Store Identity once a per-shop loader is wanted.
const LoaderOverlay = ({ isVisible = true, message = 'Laddar…' }) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-linear-to-br from-[#1a1a1a] to-[#303030] transition-opacity duration-500 ease-out pointer-events-none ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Generic placeholder mark */}
      <img
        src={mark}
        alt=""
        aria-hidden="true"
        className="w-20 h-auto mb-6 animate-pulse opacity-90"
      />
      {/* Subtle loading text */}
      <p className="text-white text-sm tracking-wide opacity-90">
        {message}
      </p>
    </div>
  );
};

export default LoaderOverlay;
