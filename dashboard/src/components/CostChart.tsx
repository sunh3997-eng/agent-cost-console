import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TimeSeriesPoint } from '@agent-cost-console/shared'

interface CostChartProps {
  data: TimeSeriesPoint[]
}

export default function CostChart({ data }: CostChartProps) {
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    cost: parseFloat(d.cost_usd.toFixed(6)),
  }))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Cost Over Time (USD)</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          No data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={(v: number) => `$${v.toFixed(4)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#10b981' }}
              formatter={(v: number) => [`$${v.toFixed(6)}`, 'Cost']}
            />
            <Area
              type="monotone"
              dataKey="cost"
              name="Cost (USD)"
              stroke="#10b981"
              fill="url(#costGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
