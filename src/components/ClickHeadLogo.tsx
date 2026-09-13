import React from 'react';

interface ClickHeadLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

export const ClickHeadLogo: React.FC<ClickHeadLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-sm tracking-tight',
    md: 'text-lg tracking-tight',
    lg: 'text-2xl tracking-tighter',
    xl: 'text-4xl tracking-tighter',
  };

  // 16-blade radial pinwheel aperture blades
  const bladeCount = 16;
  const blades = Array.from({ length: bladeCount }, (_, i) => {
    const angle = (i * 360) / bladeCount;
    return angle;
  });

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Non-Generic Bespoke 16-Blade Geometric Pinwheel Aperture Emblem */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full transform transition-transform hover:rotate-45 duration-700"
        >
          {/* Outer Ring boundary */}
          <circle cx="50" cy="50" r="48" fill="#0A1810" stroke="#1F3D29" strokeWidth="2" />
          
          {/* Radial geometric fan blades radiating outward */}
          <g transform="translate(50, 50)">
            {blades.map((deg, index) => {
              const isAccent = index % 4 === 0;
              const isHighlight = index % 2 === 0;
              const fill = isAccent ? '#B4F82C' : isHighlight ? '#E8EDE0' : '#4ADE80';
              const opacity = isAccent ? '1' : isHighlight ? '0.85' : '0.55';

              return (
                <path
                  key={deg}
                  d="M -3 -12 L 0 -45 L 6 -43 L 3 -12 Z"
                  transform={`rotate(${deg})`}
                  fill={fill}
                  fillOpacity={opacity}
                />
              );
            })}
            {/* Center Core Hub */}
            <circle cx="0" cy="0" r="10" fill="#07110C" stroke="#B4F82C" strokeWidth="3" />
            <circle cx="0" cy="0" r="4" fill="#B4F82C" />
          </g>
        </svg>
      </div>

      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              style={{ fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif" }}
              className={`font-extrabold text-white uppercase ${textSizes[size]}`}
            >
              CLICK<span className="text-[#B4F82C]">HEAD</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
