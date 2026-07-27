import { useEffect, useState } from 'react';
import axios from 'axios';

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

  useEffect(() => {
    axios
      .get<HealthResponse>('/api/health')
      .then((res) => setStatus(res.data.data.status))
      .catch(() => setStatus('backend unreachable'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-800">University ERP</h1>
        <p className="mt-2 text-slate-500">
          Backend status: <span className="font-mono">{status}</span>
        </p>
      </div>
    </div>
  );
}

export default App;
