import React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
  loading?: boolean;
}

const colorMap = {
  blue:   'text-blue-400   bg-blue-500/10   border-blue-500/20',
  green:  'text-green-400  bg-green-500/10  border-green-500/20',
  amber:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  red:    'text-red-400    bg-red-500/10    border-red-500/20',
};

export const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon: Icon, color = 'blue', loading,
}) => {
  return (
    <div className="stat-card group hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <div className={clsx('p-2 rounded-lg border', colorMap[color])}>
          <Icon size={16} />
        </div>
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-24 bg-gray-800 animate-pulse rounded" />
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight text-gray-100">{value}</p>
      )}
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
};
