import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CRMReasonsChart({ data, L }) {
  if (!data.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
      <p className="text-sm font-bold mb-3">{L('توزيع أسباب الخسارة', 'دابەشکردنی هۆکارەکانی دۆڕان')}</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}