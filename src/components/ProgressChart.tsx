import React from 'react';
import { useStore } from '../lib/store';
import { TrendingUp } from 'lucide-react';
import { getGradeFromPercentage, SemesterProgress } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomProgressTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-sans">
        <p className="font-bold text-slate-200 border-b border-slate-700 pb-1.5 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-bold text-white">
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

interface ProgressChartProps {
  studentId: string;
}

export function ProgressChart({ studentId }: ProgressChartProps) {
  const { users, cceMarks } = useStore();
  const student = users.find(u => u.id === studentId);

  if (!student) return null;

  // Group marks by Month and Level for more granular progress tracking
  const studentMarks = cceMarks.filter(m => m.studentId === student.id);
  
  const marksByPeriod: Record<string, { totalScore: number; totalMax: number; latestDate: Date }> = {};

  studentMarks.forEach(m => {
    // Group by month and level (e.g., "Jan CCE-1")
    const period = `${m.month || ''} ${m.cceLevel}`.trim() || 'General';
    if (!marksByPeriod[period]) {
      marksByPeriod[period] = { totalScore: 0, totalMax: 0, latestDate: new Date(m.date) };
    }
    marksByPeriod[period].totalScore += (m.score === 'Ab' ? 0 : Number(m.score) || 0);
    marksByPeriod[period].totalMax += m.maxScore;
    const mDate = new Date(m.date);
    if (mDate > marksByPeriod[period].latestDate) {
      marksByPeriod[period].latestDate = mDate;
    }
  });

  const trendData = Object.entries(marksByPeriod)
    .sort((a, b) => a[1].latestDate.getTime() - b[1].latestDate.getTime())
    .map(([period, data]) => ({
      period,
      academicScore: data.totalMax > 0 ? Math.round((data.totalScore / data.totalMax) * 100 * 10) / 10 : 0
    }));

  // Fallback data if no marks exist
  const finalTrendData = trendData.length > 0 ? trendData : [
    { period: 'Initial', academicScore: 70 },
    { period: 'Level 1', academicScore: 75 },
    { period: 'Level 2', academicScore: 82 }
  ];

  const latestData = finalTrendData[finalTrendData.length - 1];
  const prevData = finalTrendData.length >= 2 ? finalTrendData[finalTrendData.length - 2] : null;
  const academicDelta = prevData 
    ? Math.round((latestData.academicScore - prevData.academicScore) * 10) / 10 
    : 0;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 m-0 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-700" />
            CCE Monthly & Level Progress
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-md border border-blue-100">
            {academicDelta >= 0 ? `📈 +${academicDelta}% Improvement` : `📉 ${academicDelta}% Change`}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Latest Evaluation Avg</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-blue-900">{latestData.academicScore.toFixed(1)}%</span>
              <span className="text-xs font-bold text-blue-700">
                ({getGradeFromPercentage(latestData.academicScore).label})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block font-medium">Period: {latestData.period}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Assessments Counted</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-800">{finalTrendData.length}</span>
              <span className="text-xs font-semibold text-slate-500">Evaluation Periods</span>
            </div>
          </div>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={finalTrendData} margin={{ top: 15, right: 25, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="period" 
                stroke="#64748b" 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }} 
                dy={8}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                ticks={[0, 25, 50, 75, 100]} 
                stroke="#64748b" 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} 
                unit="%"
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <Tooltip content={<CustomProgressTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                iconType="circle"
              />
              <Line 
                type="monotone" 
                dataKey="academicScore" 
                name="CCE Percentage (%)" 
                stroke="#1d4ed8" 
                strokeWidth={3} 
                dot={{ r: 4.5, fill: '#1d4ed8', strokeWidth: 2, stroke: '#ffffff' }} 
                activeDot={{ r: 7, fill: '#1e40af' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
