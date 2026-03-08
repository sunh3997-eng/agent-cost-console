import React from 'react';
import clsx from 'clsx';
import type { RequestLog } from '@agent-cost-console/shared';

interface Props {
  rows: RequestLog[];
  loading?: boolean;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString([], {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return ts;
  }
}

const ProviderBadge: React.FC<{ provider: string }> = ({ provider }) => (
  <span className={clsx('badge', provider === 'openai' ? 'badge-purple' : provider === 'anthropic' ? 'badge-amber' : 'bg-gray-700 text-gray-300 badge')}>
    {provider}
  </span>
);

const StatusBadge: React.FC<{ code: number }> = ({ code }) => (
  <span className={clsx('badge', code < 300 ? 'badge-green' : code < 500 ? 'badge-amber' : 'badge-red')}>
    {code}
  </span>
);

export const LogTable: React.FC<Props> = ({ rows, loading }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
        No requests yet. Start sending API calls through the proxy!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {['Time', 'Provider', 'Model', 'Tokens', 'Cost', 'Latency', 'Status', 'Cache'].map(h => (
              <th key={h} className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-800/40 transition-colors">
              <td className="py-2.5 px-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                {formatTime(row.timestamp)}
              </td>
              <td className="py-2.5 px-3 whitespace-nowrap">
                <ProviderBadge provider={row.provider} />
              </td>
              <td className="py-2.5 px-3 text-xs text-gray-300 font-mono max-w-[180px] truncate whitespace-nowrap" title={row.model}>
                {row.model}
              </td>
              <td className="py-2.5 px-3 text-xs text-gray-300 whitespace-nowrap">
                {row.total_tokens.toLocaleString()}
                <span className="text-gray-600 ml-1">
                  ({row.input_tokens}↑ {row.output_tokens}↓)
                </span>
              </td>
              <td className="py-2.5 px-3 text-xs text-gray-300 font-mono whitespace-nowrap">
                ${row.cost_usd.toFixed(5)}
              </td>
              <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                <span className={clsx(
                  row.latency_ms < 500 ? 'text-green-400' :
                  row.latency_ms < 2000 ? 'text-amber-400' : 'text-red-400',
                )}>
                  {row.latency_ms}ms
                </span>
              </td>
              <td className="py-2.5 px-3 whitespace-nowrap">
                <StatusBadge code={row.status_code} />
              </td>
              <td className="py-2.5 px-3 whitespace-nowrap">
                {row.cache_hit ? (
                  <span className="badge-green">HIT</span>
                ) : (
                  <span className="text-gray-600 text-xs">MISS</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
