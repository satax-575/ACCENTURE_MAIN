import React from 'react';

export default function AccentureLogo({ className = "h-5", variant = "light" }) {
  // Signature Accenture Purple: #a100ff
  const textColor = variant === "light" ? "#ffffff" : "#000000";
  const chevronColor = "#a100ff";

  return (
    <div className={`flex items-center gap-1.5 select-none ${className}`}>
      <svg viewBox="0 0 140 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
        {/* accenture text */}
        <text 
          x="2" 
          y="24" 
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          fontSize="22" 
          fontWeight="700" 
          letterSpacing="-0.5px"
          fill={textColor}
        >
          accenture
        </text>
        {/* signature purple chevron '>' above the 't' */}
        <path 
          d="M 69 4 L 75 8.5 L 69 13 L 71.5 14.5 L 79 8.5 L 71.5 2.5 Z" 
          fill={chevronColor} 
        />
      </svg>
    </div>
  );
}

export function AccentureSymbol({ className = "w-6 h-6" }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-tr from-[#a100ff] to-indigo-600 rounded-xl shadow-md ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white">
        <path 
          d="M 8 5 L 15 12 L 8 19 L 11 21 L 20 12 L 11 3 Z" 
          fill="currentColor" 
        />
      </svg>
    </div>
  );
}
