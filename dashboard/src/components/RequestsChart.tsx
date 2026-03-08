import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TimeSeriesPoint } from '@agent-cost-console/shared'

interface RequestsChartProps {
  data: TimeSeriesPoint[]
}

export default function RequestsChart({ data }: RequestsChartProps) {
  const chartData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    requests: d.requests,
    cacheHits: d.cache_hits,
    cacheMisses: d.requests - d.cache_hits,
  }))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Requests & Cache Hits</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          No data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
            />
            <Bar
              dataKey="cacheMisses"
              name="Cache Misses"
              stackId="a"
              fill="#0ea5e9"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="cacheHits"
              name="Cache Hits"
              stackId="a"
              fill="#10b981"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
