import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

export function AppShell() {
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavigationOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <div className="app-shell flex min-h-dvh w-full overflow-x-clip bg-canvas text-ink lg:h-dvh lg:overflow-hidden">
      <Sidebar isOpen={navigationOpen} onNavigate={() => setNavigationOpen(false)} />
      {navigationOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setNavigationOpen(false)}
        />
      )}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        <TopBar navigationOpen={navigationOpen} onMenuClick={() => setNavigationOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:overflow-y-auto lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Notification drawer renders as a fixed overlay */}
      <NotificationDrawer />
    </div>
  );
}
