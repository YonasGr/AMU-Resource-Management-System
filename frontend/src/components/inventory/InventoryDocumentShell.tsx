import React from 'react';
import { AlertTriangle, CheckCircle2, History, LucideIcon } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';

export interface InventoryDocumentTab {
  id: InventoryTabId;
  label: string;
  icon: LucideIcon;
  activeClassName: string;
  count?: number;
}

export type InventoryTabId = 'receipt' | 'out' | 'return' | 'adjust' | 'transfer' | 'history';

interface InventoryDocumentShellProps {
  title: string;
  description: string;
  headerIcon: LucideIcon;
  breadcrumbs: Array<{ label: string; to?: string }>;
  headerActions?: React.ReactNode;
  tabs: InventoryDocumentTab[];
  activeTab: InventoryTabId;
  onTabChange: (tab: InventoryTabId) => void;
  feedback?: { type: 'success' | 'error'; message: string } | null;
  onDismissFeedback?: () => void;
  roleGuidance?: React.ReactNode;
  children: React.ReactNode;
}

export function InventoryDocumentShell({
  title,
  description,
  headerIcon,
  breadcrumbs,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  feedback,
  onDismissFeedback,
  roleGuidance,
  children,
}: InventoryDocumentShellProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={title}
        description={description}
        icon={headerIcon}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      <div
        role="tablist"
        aria-label="Inventory operation workspaces"
        className="-mx-4 flex snap-x items-center gap-2 overflow-x-auto border-b border-slate-200/90 px-4 pb-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all sm:px-4 ${
                isActive
                  ? `${tab.activeClassName} text-white shadow-xs`
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="rounded-full bg-slate-100/30 px-2 py-0.5 text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-coral-50 text-coral-800 border-coral-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-coral-600" />
          )}
          <span className="flex-1">{feedback.message}</span>
          {onDismissFeedback && (
            <button
              type="button"
              onClick={onDismissFeedback}
              className="text-xs underline opacity-80 hover:no-underline"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {roleGuidance}

      {children}
    </div>
  );
}

export function AuditorModeBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-700">
      <History className="h-4 w-4 text-purple-600" />
      <span>Auditor Read-Only Inspection Mode</span>
    </div>
  );
}
