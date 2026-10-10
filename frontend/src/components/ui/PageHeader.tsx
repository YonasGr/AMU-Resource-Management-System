import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0 space-y-1.5">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-teal-600 transition-colors font-medium">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-700 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          {Icon && (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200/60 bg-teal-50 text-teal-700 shadow-xs sm:mt-0 sm:h-10 sm:w-10">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
              {badge}
            </div>
            {description && <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">{description}</p>}
          </div>
        </div>
      </div>

      {actions && <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 sm:w-auto sm:shrink-0">{actions}</div>}
    </div>
  );
}
