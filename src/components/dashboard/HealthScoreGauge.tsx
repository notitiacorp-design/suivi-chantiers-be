import React, { useEffect, useState } from 'react';

interface HealthScoreGaugeProps {
 score: number;
 size?: 'small' | 'medium' | 'large';
 showLabel?: boolean;
}

const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({
 score,
 size = 'medium',
 showLabel = true,
}) => {
 const [animatedScore, setAnimatedScore] = useState(0);

 useEffect(() => {
 // Animation du score
 const timer = setTimeout(() => {
 const interval = setInterval(() => {
 setAnimatedScore((prev) => {
 if (prev < score) {
 return Math.min(prev + 2, score);
 }
 clearInterval(interval);
 return prev;
 });
 }, 20);
 }, 200);

 return () => clearTimeout(timer);
 }, [score]);

 const getColor = (s: number): string => {
 if (s < 40) return '#ef4444'; // rouge
 if (s < 70) return '#f97316'; // orange
 return '#10b981'; // vert
 };

 const getLabel = (s: number): string => {
 if (s < 40) return 'Critique';
 if (s < 50) return 'Attention';
 if (s < 70) return 'Bon';
 return 'Excellent';
 };

 const sizes = {
 small: { radius: 40, strokeWidth: 6, fontSize: '14px' },
 medium: { radius: 60, strokeWidth: 8, fontSize: '20px' },
 large: { radius: 80, strokeWidth: 10, fontSize: '28px' },
 };

 const { radius, strokeWidth, fontSize } = sizes[size];
 const circumference = 2 * Math.PI * radius;
 const offset = circumference - (animatedScore / 100) * circumference;
 const color = getColor(animatedScore);
 const label = getLabel(animatedScore);

 return (
 <div className="flex flex-col items-center">
 <svg
 width={(radius + strokeWidth) * 2}
 height={(radius + strokeWidth) * 2}
 className="transform -rotate-90"
 >
 {/* Cercle de fond */}
 <circle
 cx={radius + strokeWidth}
 cy={radius + strokeWidth}
 r={radius}
 stroke="#e5e7eb"
 strokeWidth={strokeWidth}
 fill="none"
 />
 {/* Cercle de progression */}
 <circle
 cx={radius + strokeWidth}
 cy={radius + strokeWidth}
 r={radius}
 stroke={color}
 strokeWidth={strokeWidth}
 fill="none"
 strokeDasharray={circumference}
 strokeDashoffset={offset}
 strokeLinecap="round"
 style={{
 transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
 }}
 />
 {/* Score au centre */}
 <text
 x={radius + strokeWidth}
 y={radius + strokeWidth}
 textAnchor="middle"
 dominantBaseline="middle"
 className="transform rotate-90"
 style={{
 fontSize: fontSize,
 fontWeight: 'bold',
 fill: color,
 transformOrigin: `${radius + strokeWidth}px ${radius + strokeWidth}px`,
 }}
 >
 {animatedScore}
 </text>
 </svg>
 {showLabel && (
 <p
 className="mt-2 font-semibold"
 style={{ color: color }}
 >
 {label}
 </p>
 )}
 </div>
 );
};

export default HealthScoreGauge;