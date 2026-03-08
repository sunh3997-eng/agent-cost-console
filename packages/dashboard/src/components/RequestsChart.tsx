import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }> = ({
  active, payload, label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-gray-100 font-medium">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export const RequestsChart: React.FC<Props> = ({ data, loading }) => {
  const chartData = useMemo(() =>
    data.map(d => ({
      ...d,
      time: formatBucket(d.timestamp),
      tokens: d.tokens,
      requests: d.requests,
      cacheHits: d.cacheHits,
    })),
    [data],
  );

  if (loading) {
    return <div className="h-64 bg-gray-800 animate-pulse rounded-lg" />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gRequests" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gCache" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
        <Area
          type="monotone"
          dataKey="requests"
          name="Requests"
          stroke="#38bdf8"
          fill="url(#gRequests)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="cacheHits"
          name="Cache Hits"
          stroke="#34d399"
          fill="url(#gCache)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
