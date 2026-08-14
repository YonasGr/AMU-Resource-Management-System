import { cn } from '../../lib/cn';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-surface-alt text-muted border-border',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-accent/10 text-accent border-accent/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  accent: 'bg-primary/10 text-primary border-primary/30',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Maps common backend status/type strings to a sensible badge tone automatically. */
export function statusTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'COMPLETED'].includes(s)) return 'success';
  if (['PENDING', 'SUBMITTED', 'DRAFT'].includes(s)) return 'warning';
  if (['INACTIVE', 'REJECTED', 'CANCELLED', 'DISPOSED'].includes(s)) return 'danger';
  return 'neutral';
}
