import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import { useAuthStore } from './store/auth.store';

interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    service: string;
    time: string;
  };
}

function App() {
  const [status, setStatus] = useState<string>('checking...');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    api
      .get<HealthResponse>('/health')
      .then((res) => setStatus(res.data.data.status))
      .catch(() => setStatus('backend unreachable'));
  }, []);

  const handleLogout = async () => {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    }
    clearSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-800">University ERP</h1>
        <p className="mt-2 text-slate-500">
          Backend status: <span className="font-mono">{status}</span>
        </p>
        {user && (
          <p className="mt-1 text-slate-500">
            Signed in as <span className="font-medium">{user.fullName}</span> ({user.email})
          </p>
        )}
        <button
          onClick={handleLogout}
          className="mt-4 text-sm text-slate-600 underline hover:text-slate-800"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export default App;
