import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'teal'
  | 'brand'
  | 'purple'
  | 'amber'
  | 'coral';

const toneStyles: Record<BadgeTone, { bg: string; dot: string }> = {
  neutral: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dot: 'bg-slate-400',
  },
  success: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  amber: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-coral-50 text-coral-700 border-coral-200',
    dot: 'bg-coral-500',
  },
  coral: {
    bg: 'bg-coral-50 text-coral-700 border-coral-200',
    dot: 'bg-coral-500',
  },
  info: {
    bg: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  teal: {
    bg: 'bg-teal-50 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
  },
  brand: {
    bg: 'bg-brand-50 text-brand-800 border-brand-200',
    dot: 'bg-brand-600',
  },
  purple: {
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
};

export function Badge({
  children,
  tone = 'neutral',
  withDot = true,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  withDot?: boolean;
  className?: string;
}) {
  const style = toneStyles[tone] || toneStyles.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
        style.bg,
        className,
      )}
    >
      {withDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot)} />
      )}
      <span>{children}</span>
    </span>
  );
}

/** Maps common backend status/type strings to a sensible badge tone automatically. */
export function statusTone(status?: string): BadgeTone {
  if (!status) return 'neutral';
  const s = status.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'COMPLETED', 'ISSUED', 'STOCK_IN'].includes(s)) return 'success';
  if (['PENDING', 'SUBMITTED', 'DRAFT', 'WARNING', 'RETURN'].includes(s)) return 'warning';
  if (['INACTIVE', 'REJECTED', 'CANCELLED', 'DISPOSED', 'LOW_STOCK', 'CRITICAL'].includes(s)) return 'danger';
  if (['STOCK_OUT', 'PURCHASE_RECEIVE', 'INFO'].includes(s)) return 'info';
  if (['TRANSFER', 'ADJUSTMENT'].includes(s)) return 'teal';
  if (['ADMINISTRATOR', 'STORE_MANAGER'].includes(s)) return 'purple';
  if (['STOREKEEPER', 'AUDITOR'].includes(s)) return 'brand';
  return 'neutral';
}

