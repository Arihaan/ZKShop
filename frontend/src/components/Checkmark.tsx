import React from 'react';

export default function Checkmark(props: { size?: number; stroke?: string }) {
  const size = props.size ?? 48;
  const stroke = props.stroke ?? '#10b981';
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={0.25}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        style={{
          animation: 'zkshop-check-stroke 600ms ease forwards',
        }}
      />
      <path
        d={`M ${size * 0.32} ${size * 0.54} L ${size * 0.46} ${size * 0.68} L ${size * 0.7} ${size * 0.38}`}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        style={{
          strokeDasharray: 100,
          strokeDashoffset: 100,
          animation: 'zkshop-check-path 500ms ease 250ms forwards',
        }}
      />
      <style>{`
        @keyframes zkshop-check-stroke { to { stroke-dashoffset: 0; } }
        @keyframes zkshop-check-path { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  );
}


