import React, { useState } from 'react';
import {
  DollarSign, Zap, BarChart2, Clock, Database, TrendingUp,
  RefreshCw, AlertCircle,
} from 'lucide-react';
import { StatCard } from './components/StatCard';
import { RequestsChart } from './components/RequestsChart';
import { CostChart } from './components/CostChart';
import { TokensChart } from './components/TokensChart';
import { LogTable } from './components/LogTable';
import { Header } from './components/Header';
import { useStats, useTimeSeries, useLogs } from './hooks/useStats';
import type { ModelStats } from '@agent-cost-console/shared';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

function formatCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(5)}`;
}

export default function App() {
  const [logsPage, setLogsPage] = useState(1);
  const { data: stats, loading: statsLoading, error: statsError } = useStats(5000);
  const { data: series, loading: seriesLoading } = useTimeSeries(5, 60, 10000);
  const { data: logs, loading: logsLoading } = useLogs(logsPage, 50, undefined, 10000);

  const lastUpdated = stats ? new Date() : undefined;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header lastUpdated={lastUpdated} />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Error banner */}
        {statsError && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} />
            <span>Cannot reach proxy API — is the proxy server running on port 4000?</span>
            <span className="text-xs text-red-500 ml-auto">{statsError}</span>
          </div>
        )}

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title="Total Requests"
            value={formatNumber(stats?.totalRequests ?? 0)}
            icon={BarChart2}
            color="blue"
            loading={statsLoading}
          />
          <StatCard
            title="Total Tokens"
            value={formatNumber(stats?.totalTokens ?? 0)}
            icon={Database}
            color="purple"
            loading={statsLoading}
          />
          <StatCard
            title="Total Cost"
            value={formatCost(stats?.totalCostUsd ?? 0)}
            icon={DollarSign}
            color="amber"
            loading={statsLoading}
          />
          <StatCard
            title="Cache Hit Rate"
            value={`${((stats?.cacheHitRate ?? 0) * 100).toFixed(1)}%`}
            subtitle={`${stats?.cacheHits ?? 0} hits saved`}
            icon={Zap}
            color="green"
            loading={statsLoading}
          />
          <StatCard
            title="Req / Min"
            value={String(stats?.requestsPerMinute ?? 0)}
            subtitle="last 60s"
            icon={TrendingUp}
            color="blue"
            loading={statsLoading}
          />
          <StatCard
            title="Avg Latency"
            value={`${stats?.avgLatencyMs ?? 0}ms`}
            icon={Clock}
            color={
              (stats?.avgLatencyMs ?? 0) < 1000 ? 'green' :
              (stats?.avgLatencyMs ?? 0) < 3000 ? 'amber' : 'red'
            }
            loading={statsLoading}
          />
        </div>

        {/* ── Charts row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Requests & cache hits over time */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-200">Requests & Cache Hits</h2>
              <span className="text-xs text-gray-500">5-min buckets</span>
            </div>
            <RequestsChart data={series} loading={seriesLoading} />
          </div>

          {/* Top models by cost */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-200">Top Models by Cost</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-400 inline-block" />OpenAI</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" />Anthropic</span>
              </div>
            </div>
            <CostChart models={(stats?.topModels ?? []) as ModelStats[]} loading={statsLoading} />
          </div>
        </div>

        {/* ── Tokens over time ────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-200">Token Usage Over Time</h2>
            <span className="text-xs text-gray-500">5-min buckets</span>
          </div>
          <TokensChart data={series} loading={seriesLoading} />
        </div>

        {/* ── Recent logs ─────────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-200">Recent Requests</h2>
            <div className="flex items-center gap-3">
              {logs && (
                <span className="text-xs text-gray-500">
                  {logs.total.toLocaleString()} total
                </span>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                  className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-md transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-xs text-gray-500 px-2">p{logsPage}</span>
                <button
                  onClick={() => setLogsPage(p => p + 1)}
                  disabled={!logs || logs.page * logs.pageSize >= logs.total}
                  className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-md transition-colors"
                >
                  Next →
                </button>
              </div>
              <button
                onClick={() => {/* trigger refresh */ }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>
          <LogTable rows={(logs?.rows ?? []) as any[]} loading={logsLoading} />
        </div>

        {/* ── Proxy setup instructions ─────────────────────────────────────── */}
        <div className="card border-brand-500/20 bg-brand-900/10">
          <h2 className="text-sm font-semibold text-gray-200 mb-3">🔌 Connect Your App</h2>
          <p className="text-xs text-gray-400 mb-3">
            Point your OpenAI client to the proxy URL to start tracking costs automatically.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <div className="text-gray-500 mb-1">Python / OpenAI SDK</div>
              <div className="text-green-300">
                {'client = OpenAI(base_url="http://localhost:4000/v1")'}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <div className="text-gray-500 mb-1">Curl / REST</div>
              <div className="text-green-300">
                {'curl http://localhost:4000/v1/chat/completions \\'}
              </div>
              <div className="text-green-300 pl-4">
                {'-H "Authorization: Bearer $OPENAI_API_KEY"'}
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-gray-700 pb-4">
          Agent Cost Console — built with Node.js · Express · React · Recharts · SQLite
        </footer>
      </main>
    </div>
  );
}
