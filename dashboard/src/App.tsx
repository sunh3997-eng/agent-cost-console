import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import type { DashboardData } from '@agent-cost-console/shared'

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10_000)

    // SSE for real-time updates
    const sse = new EventSource('/api/stream')
    sse.onmessage = (e) => {
      try {
        const update = JSON.parse(e.data) as DashboardData
        setData(update)
        setLastUpdated(new Date())
      } catch {
        // ignore parse errors
      }
    }
    sse.onerror = () => {
      // SSE errors are non-fatal, polling will keep data fresh
    }

    return () => {
      clearInterval(interval)
      sse.close()
    }
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-gray-400 text-sm">Connecting to proxy...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">$</span>
            </div>
            <h1 className="text-xl font-semibold text-white">Agent Cost Console</h1>
            <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">MVP</span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="bg-red-900/30 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm">
            Error: {error}. Make sure the proxy server is running on port 3001.
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6">
        {data ? (
          <Dashboard data={data} />
        ) : (
          <div className="text-center py-20 text-gray-500">
            No data yet. Send some API requests through the proxy to see stats.
          </div>
        )}
      </main>
    </div>
  )
}
