import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ModelStats } from '@agent-cost-console/shared';

interface Props {
  models: ModelStats[];
  loading?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai:    '#818cf8',
  anthropic: '#f97316',
  unknown:   '#6b7280',
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; payload: ModelStats & { shortName: string } }>;
  label?: string;
}> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[180px]">
      <p className="text-gray-100 font-medium mb-1">{d.model}</p>
      <div className="space-y-1 text-gray-400">
        <div className="flex justify-between gap-4"><span>Cost</span><span className="text-gray-100">${d.costUsd.toFixed(4)}</span></div>
        <div className="flex justify-between gap-4"><span>Requests</span><span className="text-gray-100">{d.requests.toLocaleString()}</span></div>
        <div className="flex justify-between gap-4"><span>Tokens</span><span className="text-gray-100">{d.totalTokens.toLocaleString()}</span></div>
        <div className="flex justify-between gap-4"><span>Cache hits</span><span className="text-gray-100">{d.cacheHits}</span></div>
      </div>
    </div>
  );
};

export const CostChart: React.FC<Props> = ({ models, loading }) => {
  const data = useMemo(() =>
    models.slice(0, 8).map(m => ({
      ...m,
      shortName: m.model.replace('claude-', 'c-').replace('gpt-', 'g-').replace('-20240229', '').replace('-20241022', ''),
    })),
    [models],
  );

  if (loading) return <div className="h-64 bg-gray-800 animate-pulse rounded-lg" />;
  if (!data.length) return <div className="h-64 flex items-center justify-center text-gray-600 text-sm">No data yet</div>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => `$${v.toFixed(3)}`} />
        <YAxis type="category" dataKey="shortName" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false}
          tickLine={false} width={90} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="costUsd" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map(entry => (
            <Cell
              key={entry.model}
              fill={PROVIDER_COLORS[entry.provider] ?? PROVIDER_COLORS.unknown}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
