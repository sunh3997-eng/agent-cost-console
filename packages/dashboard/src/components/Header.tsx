import React from 'react';
import { Activity, DollarSign, Zap } from 'lucide-react';

interface Props {
  lastUpdated?: Date;
}

export const Header: React.FC<Props> = ({ lastUpdated }) => {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-brand-600/20 border border-brand-500/30 rounded-lg px-3 py-1.5">
            <DollarSign size={16} className="text-brand-400" />
            <span className="text-sm font-semibold text-brand-300">Agent Cost Console</span>
          </div>
          <span className="hidden sm:inline-block text-xs text-gray-600">LLM API cost monitoring</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-600 hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity size={13} />
            <Zap size={13} />
          </div>
        </div>
      </div>
    </header>
  );
};
