import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

export function AppShell() {
  return (
    <div className="flex h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <Outlet />
        </main>
      </div>
      {/* Notification drawer renders as a fixed overlay */}
      <NotificationDrawer />
    </div>
  );
}

