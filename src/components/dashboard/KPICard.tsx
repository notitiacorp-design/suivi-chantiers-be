import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
 title: string;
 value: number;
 variation: number;
 icon: React.ReactNode;
 color: 'blue' | 'green' | 'red' | 'orange' | 'purple';
 suffix?: string;
}

const KPICard: React.FC<KPICardProps> = ({
 title,
 value,
 variation,
 icon,
 color,
 suffix = '',
}) => {
 const [isVisible, setIsVisible] = useState(false);

 useEffect(() => {
 // Animation au chargement
 setTimeout(() => setIsVisible(true), 100);
 }, []);

 const colorClasses = {
 blue: 'bg-blue-50 text-blue-600 border-blue-200',
 green: 'bg-green-50 text-green-600 border-green-200',
 red: 'bg-red-50 text-red-600 border-red-200',
 orange: 'bg-orange-50 text-orange-600 border-orange-200',
 purple: 'bg-purple-50 text-purple-600 border-purple-200',
 };

 const iconBgClasses = {
 blue: 'bg-blue-100',
 green: 'bg-green-100',
 red: 'bg-red-100',
 orange: 'bg-orange-100',
 purple: 'bg-purple-100',
 };

 return (
 <div
 className={`
 bg-white rounded-lg shadow-md p-6 border-l-4 ${colorClasses[color]}
 transform transition-all duration-500
 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
 hover:shadow-lg hover:-translate-y-1
 `}
 >
 <div className="flex items-center justify-between mb-4">
 <div className={`p-3 rounded-full ${iconBgClasses[color]}`}>
 {icon}
 </div>
 <div className="flex items-center">
 {variation >= 0 ? (
 <TrendingUp className="w-4 h-4 text-green-600" />
 ) : (
 <TrendingDown className="w-4 h-4 text-red-600" />
 )}
 <span
 className={`ml-1 text-sm font-semibold ${
 variation >= 0 ? 'text-green-600' : 'text-red-600'
 }`}
 >
 {variation > 0 ? '+' : ''}{variation}%
 </span>
 </div>
 </div>
 <h3 className="text-gray-600 text-sm font-medium mb-2">{title}</h3>
 <p className="text-3xl font-bold text-gray-900">
 {value}{suffix}
 </p>
 <p className="text-xs text-gray-500 mt-2">vs semaine précédente</p>
 </div>
 );
};

export default KPICard;