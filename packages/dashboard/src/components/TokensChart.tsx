import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesPoint } from '@agent-cost-console/shared';

interface Props {
  data: TimeSeriesPoint[];
  loading?: boolean;
}

function formatBucket(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-medium">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export const TokensChart: React.FC<Props> = ({ data, loading }) => {
  const chartData = useMemo(() =>
    data.map(d => ({ ...d, time: formatBucket(d.timestamp) })),
    [data],
  );

  if (loading) return <div className="h-48 bg-gray-800 animate-pulse rounded-lg" />;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={40}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="tokens"
          name="Tokens"
          stroke="#a78bfa"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#a78bfa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
