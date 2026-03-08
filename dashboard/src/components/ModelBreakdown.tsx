import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ModelBreakdown as ModelBreakdownType } from '@agent-cost-console/shared'

interface ModelBreakdownProps {
  models: ModelBreakdownType[]
}

export default function ModelBreakdown({ models }: ModelBreakdownProps) {
  const sorted = [...models].sort((a, b) => b.total_cost_usd - a.total_cost_usd)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Cost by Model</h3>
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">No data yet</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer
            width="100%"
            height={Math.max(sorted.length * 44, 100)}
          >
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(4)}`}
              />
              <YAxis
                type="category"
                dataKey="model"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={160}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v: number) => [`$${v.toFixed(6)}`, 'Cost']}
              />
              <Bar
                dataKey="total_cost_usd"
                name="Cost (USD)"
                fill="#0ea5e9"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-1">
            {sorted.map(m => (
              <div
                key={`${m.provider}:${m.model}`}
                className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
              >
                <div className="min-w-0 flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        m.provider === 'anthropic'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {m.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                    </span>
                    <div className="text-sm text-gray-200 font-mono truncate">{m.model}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {m.request_count.toLocaleString()} requests &middot;{' '}
                    {m.total_tokens.toLocaleString()} tokens
                  </div>
                </div>
                <div className="text-sm font-medium text-sky-400 flex-shrink-0">
                  ${m.total_cost_usd.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
