import { NavLink, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GrindPage } from './pages/GrindPage';
import { ConnectPage } from './pages/ConnectPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SessionPage } from './pages/SessionPage';
import { BeansPage } from './pages/BeansPage';
import { DiagnosePage } from './pages/DiagnosePage';
import { JournalPage } from './pages/JournalPage';
import { JournalEntryPage } from './pages/JournalEntryPage';
import { SettingsMenu } from './components/SettingsMenu';
import { useGrinderStore } from './store/grinderStore';

export default function App() {
  const { t } = useTranslation();
  const status = useGrinderStore((s) => s.status);
  const connected = status === 'connected';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">{t('app.brand')}</div>
        <div className="topbar-actions">
          <div className={`pill ${connected ? 'on' : 'off'}`}>
            {connected ? t('app.wifi') : t('app.offline')}
          </div>
          <SettingsMenu />
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
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:id" element={<JournalEntryPage />} />
        </Routes>
      </main>

      <nav className="tabbar">
        <NavLink to="/" end>
          {t('nav.grind')}
        </NavLink>
        <NavLink to="/journal">{t('nav.journal')}</NavLink>
        <NavLink to="/analytics">{t('nav.analytics')}</NavLink>
        <NavLink to="/connect">{t('nav.connect')}</NavLink>
      </nav>
    </div>
  );
}
