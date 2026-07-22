import { NavLink, Route, Routes } from 'react-router-dom';
import { GrindPage } from './pages/GrindPage';
import { ConnectPage } from './pages/ConnectPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SessionPage } from './pages/SessionPage';
import { BeansPage } from './pages/BeansPage';
import { DiagnosePage } from './pages/DiagnosePage';
import { useGrinderStore } from './store/grinderStore';

export default function App() {
  const status = useGrinderStore((s) => s.status);
  const connected = status === 'connected';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Grind Companion</div>
        <div className={`pill ${connected ? 'on' : 'off'}`}>
          {connected ? 'WiFi' : 'offline'}
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<GrindPage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/beans" element={<BeansPage />} />
          <Route path="/diagnose" element={<DiagnosePage />} />
        </Routes>
      </main>

      <nav className="tabbar">
        <NavLink to="/" end>
          Grind
        </NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
        <NavLink to="/connect">Connect</NavLink>
      </nav>
    </div>
  );
}
