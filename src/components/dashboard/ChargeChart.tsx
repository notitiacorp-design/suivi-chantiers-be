import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Users } from 'lucide-react';

const ChargeChart: React.FC = () => {
 const [periode, setPeriode] = useState<4 | 8 | 12>(4);

 const data = useMemo(() => {
 // Générer des données mockées pour la charge
 const semaines = [];
 const today = new Date();
 const cas = ['Jean Dupont', 'Marie Martin', 'Pierre Dubois'];

 for (let i = 0; i < periode; i++) {
 const weekDate = new Date(today);
 weekDate.setDate(weekDate.getDate() + i * 7);
 const weekLabel = `S${i + 1}`;

 const weekData: any = {
 semaine: weekLabel,
 date: weekDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
 };

 cas.forEach((ca) => {
 const heuresPrevues = Math.round(30 + Math.random() * 25);
 const heuresReelles = Math.round(heuresPrevues * (0.8 + Math.random() * 0.4));
 weekData[`${ca}_prevues`] = heuresPrevues;
 weekData[`${ca}_reelles`] = heuresReelles;
 });

 semaines.push(weekData);
 }

 return semaines;
 }, [periode]);

 const CustomTooltip = ({ active, payload, label }: any) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
 <p className="font-semibold text-gray-900 mb-2">{label}</p>
 {payload.map((entry: any, index: number) => (
 <p key={index} className="text-sm" style={{ color: entry.color }}>
 {entry.name}: {entry.value}h
 </p>
 ))}
 </div>
 );
 }
 return null;
 };

 const colors = {
 'Jean Dupont': { prevues: '#3b82f6', reelles: '#1e40af' },
 'Marie Martin': { prevues: '#8b5cf6', reelles: '#5b21b6' },
 'Pierre Dubois': { prevues: '#10b981', reelles: '#047857' },
 };

 return (
 <div>
 <div className="flex justify-between items-center mb-4">
 <div className="flex items-center">
 <Users className="w-6 h-6 text-blue-600 mr-2" />
 <h3 className="text-xl font-bold text-gray-900">
 Charge par Chef d'Affaires
 </h3>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={() => setPeriode(4)}
 className={`px-3 py-1 rounded text-sm font-medium transition ${
 periode === 4
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
 }`}
 >
 4 semaines
 </button>
 <button
 onClick={() => setPeriode(8)}
 className={`px-3 py-1 rounded text-sm font-medium transition ${
 periode === 8
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
 }`}
 >
 8 semaines
 </button>
 <button
 onClick={() => setPeriode(12)}
 className={`px-3 py-1 rounded text-sm font-medium transition ${
 periode === 12
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
 }`}
 >
 12 semaines
 </button>
 </div>
 </div>

 <div className="mb-4 p-4 bg-blue-50 rounded-lg">
 <p className="text-sm text-gray-700">
 <span className="font-semibold">Barres pleines:</span> Heures prévues
 <span className="ml-4 font-semibold">Barres hachurées:</span> Heures réelles
 </p>
 <p className="text-sm text-red-600 font-semibold mt-2">
 â ï¸ Seuil de surcharge: 45h/semaine
 </p>
 </div>

 <ResponsiveContainer width="100%" height={400}>
 <BarChart data={data}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
 <XAxis dataKey="semaine" tick={{ fontSize: 12 }} />
 <YAxis tick={{ fontSize: 12 }} label={{ value: 'Heures', angle: -90, position: 'insideLeft' }} />
 <Tooltip content={<CustomTooltip />} />
 <Legend />
 <ReferenceLine
 y={45}
 stroke="#ef4444"
 strokeDasharray="3 3"
 label={{ value: 'Seuil surcharge', position: 'right', fill: '#ef4444', fontSize: 12 }}
 />

 {/* Jean Dupont */}
 <Bar
 dataKey="Jean Dupont_prevues"
 fill={colors['Jean Dupont'].prevues}
 name="J. Dupont (prévues)"
 stackId="Jean Dupont"
 />
 <Bar
 dataKey="Jean Dupont_reelles"
 fill={colors['Jean Dupont'].reelles}
 name="J. Dupont (réelles)"
 stackId="Jean Dupont"
 />

 {/* Marie Martin */}
 <Bar
 dataKey="Marie Martin_prevues"
 fill={colors['Marie Martin'].prevues}
 name="M. Martin (prévues)"
 stackId="Marie Martin"
 />
 <Bar
 dataKey="Marie Martin_reelles"
 fill={colors['Marie Martin'].reelles}
 name="M. Martin (réelles)"
 stackId="Marie Martin"
 />

 {/* Pierre Dubois */}
 <Bar
 dataKey="Pierre Dubois_prevues"
 fill={colors['Pierre Dubois'].prevues}
 name="P. Dubois (prévues)"
 stackId="Pierre Dubois"
 />
 <Bar
 dataKey="Pierre Dubois_reelles"
 fill={colors['Pierre Dubois'].reelles}
 name="P. Dubois (réelles)"
 stackId="Pierre Dubois"
 />
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
};

export default ChargeChart;
