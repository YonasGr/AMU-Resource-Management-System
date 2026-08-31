import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export type StatCardTone = 'teal' | 'coral' | 'amber' | 'emerald' | 'cyan' | 'brand' | 'purple';

const toneClasses: Record<
  StatCardTone,
  { iconBg: string; iconColor: string; ringColor: string; trendBg: string; trendColor: string; barBg: string }
> = {
  teal: {
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    ringColor: 'ring-teal-500/10',
    trendBg: 'bg-teal-50',
    trendColor: 'text-teal-700',
    barBg: 'bg-teal-500',
  },
  cyan: {
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    ringColor: 'ring-cyan-500/10',
    trendBg: 'bg-cyan-50',
    trendColor: 'text-cyan-700',
    barBg: 'bg-cyan-500',
  },
  coral: {
    iconBg: 'bg-coral-50',
    iconColor: 'text-coral-500',
    ringColor: 'ring-coral-500/10',
    trendBg: 'bg-coral-50',
    trendColor: 'text-coral-700',
    barBg: 'bg-coral-500',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    ringColor: 'ring-amber-500/10',
    trendBg: 'bg-amber-50',
    trendColor: 'text-amber-700',
    barBg: 'bg-amber-500',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    ringColor: 'ring-emerald-500/10',
    trendBg: 'bg-emerald-50',
    trendColor: 'text-emerald-700',
    barBg: 'bg-emerald-500',
  },
  brand: {
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-700',
    ringColor: 'ring-brand-500/10',
    trendBg: 'bg-brand-50',
    trendColor: 'text-brand-800',
    barBg: 'bg-brand-600',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    ringColor: 'ring-purple-500/10',
    trendBg: 'bg-purple-50',
    trendColor: 'text-purple-700',
    barBg: 'bg-purple-500',
  },
};

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tone?: StatCardTone;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'teal',
  trend,
  progress,
  badge,
  onClick,
  className,
}: StatCardProps) {
  const t = toneClasses[tone] || toneClasses.teal;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:border-slate-300 active:scale-[0.99]',
        className,
      )}
    >
      {/* Top row: Label & Icon */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h4 className="text-3xl font-bold tracking-tight text-slate-900">{value}</h4>
            {badge && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {badge}
              </span>
            )}
          </div>
        </div>

        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-4 transition-transform duration-200 group-hover:scale-105',
            t.iconBg,
            t.iconColor,
            t.ringColor,
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </div>
      </div>

      {/* Subtitle / Context */}
      {subtitle && <p className="mt-2 text-xs font-medium text-slate-500">{subtitle}</p>}

      {/* Optional Progress Bar */}
      {progress && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[11px] font-medium text-slate-500">
            <span>{progress.label || 'Progress'}</span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', t.barBg)}
              style={{
                width: `${Math.min(100, Math.max(0, (progress.current / (progress.total || 1)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Trend pill */}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
              trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-coral-50 text-coral-700',
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </span>
          {trend.label && <span className="text-slate-400 font-normal">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
