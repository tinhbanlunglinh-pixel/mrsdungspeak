import React from 'react';

export const BrandLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} bg-white rounded-xl flex items-center justify-center p-1 shadow-sm`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Outer shield frame */}
      <path d="M50 10 L85 25 L85 60 C85 80 50 90 50 90 C50 90 15 80 15 60 L15 25 Z" fill="none" stroke="#00a84d" strokeWidth="4" />
      {/* Leaf details */}
      <path d="M10 30 Q5 35 10 40 M10 45 Q5 50 10 55 M10 60 Q5 65 10 70" fill="none" stroke="#00a84d" strokeWidth="2" strokeLinecap="round" />
      <path d="M90 30 Q95 35 90 40 M90 45 Q95 50 90 55 M90 60 Q95 65 90 70" fill="none" stroke="#00a84d" strokeWidth="2" strokeLinecap="round" />
      {/* People icon/logo center */}
      <circle cx="50" cy="40" r="4" fill="#d00" />
      <circle cx="42" cy="46" r="3" fill="#333" />
      <circle cx="58" cy="46" r="3" fill="#333" />
      <path d="M50 55 Q50 45 40 50 Q35 55 40 75 L60 75 Q65 55 60 50 Q50 45 50 55" fill="#333" />
      <path d="M50 55 L50 75" stroke="white" strokeWidth="2" />
    </svg>
  </div>
);
