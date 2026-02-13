import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TrendChartProps {
 chantierId: string | null;
}

const TrendChart: React.FC<TrendChartProps> = ({ chantierId }) => {
 const [periode, setPeriode] = useState<30 | 60 | 90>(30);
 const [data, setData] = useState<any[]>([]);

 useEffect(() => {
 // Générer des données mockées pour la tendance
 const generateData = (jours: number) => {
 const result = [];
 const today = new Date();
 let scoreBase = 65;

 for (let i = jours; i >= 0; i--) {
 const date = new Date(today);
 date.setDate(date.getDate() - i);

 // Simuler une variation du score
 scoreBase += (Math.random() - 0.5) * 8;
 scoreBase = Math.max(20, Math.min(95, scoreBase));

 result.push({
 date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
 score: Math.round(scoreBase),
 });
 }

 return result;
 };

 setData(generateData(periode));
 }, [periode, chantierId]);

 const CustomTooltip = ({ active, payload }: any) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
 <p className="font-semibold text-gray-900">{payload[0].payload.date}</p>
 <p className="text-sm" style={{ color: payload[0].color }}>
 Score: {payload[0].value}
 </p>
 </div>
 );
 }
 return null;
 };

 return (
 <div>
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-xl font-bold text-gray-900">
 Tendance du score santé
 </h3>
 <div className="flex space-x-2">
 <button
 onClick={() => setPeriode(30)}
 className={`px-3 py-1 rounded text-sm font-medium transition ${
 periode === 30
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
 }`}
 >
 30 jours
 </button>
 <button
 onClick={() => setPeriode(60)}
 className={`px-3 py-1 rounded text-sm font-medium transition ${
 periode === 60
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
 }`}
 >
 60 jours
 </button>
 <button
 onClick={() => setPeriode(90)}
 className={`px-3 py-1 rounded text-sm font-medium transition ${
 periode === 90
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
 }`}
 >
 90 jours
 </button>
 </div>
 </div>

 <ResponsiveContainer width="100%" height={300}>
 <LineChart data={data}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
 <XAxis
 dataKey="date"
 tick={{ fontSize: 12 }}
 interval={Math.floor(data.length / 8)}
 />
 <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
 <Tooltip content={<CustomTooltip />} />
 <Legend />
 <ReferenceLine
 y={50}
 stroke="#ef4444"
 strokeDasharray="3 3"
 label={{ value: 'Seuil critique', position: 'right', fill: '#ef4444', fontSize: 12 }}
 />
 <Line
 type="monotone"
 dataKey="score"
 stroke="#3b82f6"
 strokeWidth={3}
 dot={{ r: 3 }}
 activeDot={{ r: 6 }}
 name="Score santé"
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 );
};

export default TrendChart;