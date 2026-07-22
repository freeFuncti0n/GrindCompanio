import { useGrinderStore } from '../store/grinderStore';
import { listSessions } from '../db/database';
import { useState } from 'react';

export function ConnectPage() {
  const {
    status,
    wifiHost,
    deviceName,
    error,
    syncMessage,
    syncProgress,
    isSyncing,
    systemInfo,
    liveSupported,
    remoteSupported,
    setWifiHost,
    connectWifi,
    disconnect,
    sync,
    clearError,
  } = useGrinderStore();

  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const busy = status === 'connecting' || isSyncing;

  return (
    <div className="page">
      <h1>Connect</h1>
      <p className="muted">
        ESP und dieses Gerät müssen im gleichen <strong>2,4‑GHz‑WLAN</strong> sein. Die NAS hostet nur
        die UI — der Browser spricht direkt mit dem ESP (Port 8080).
      </p>

      <div className="card">
        <div className="label">Status</div>
        <div className="status">
          {status === 'connected'
            ? `Verbunden · ${deviceName ?? 'GrindByWeight'}`
            : status === 'connecting'
              ? 'Verbinde…'
              : status === 'error'
                ? 'Fehler'
                : 'Getrennt'}
        </div>
        {systemInfo ? <pre className="info">{systemInfo}</pre> : null}
        {status === 'connected' ? (
          <p className="muted">
            Live: {liveSupported ? 'aktiv' : '—'} · Remote:{' '}
            {remoteSupported ? 'bereit' : 'nach Firmware-Update'}
          </p>
        ) : null}
      </div>

      {status !== 'connected' ? (
        <div className="card">
          <label className="label" htmlFor="esp-ip">
            Grinder IP (LAN)
          </label>
          <input
            id="esp-ip"
            className="input"
            value={wifiHost}
            placeholder="192.168.1.42"
            onChange={(e) => setWifiHost(e.target.value)}
            autoComplete="off"
          />
          <p className="hint">Nur IP oder Host — Port 8080 wird automatisch ergänzt.</p>
          <div className="actions">
            <button
              className="btn primary"
              type="button"
              disabled={busy || !wifiHost.trim()}
              onClick={() => {
                clearError();
                void connectWifi();
              }}
            >
              WiFi verbinden
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <button
            className="btn primary"
            type="button"
            disabled={busy}
            onClick={async () => {
              clearError();
              setBusyMsg(null);
              try {
                await sync();
                await listSessions();
              } catch (e) {
                setBusyMsg(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Sync Sessions
          </button>
          <button className="btn" type="button" disabled={busy} onClick={() => void disconnect()}>
            Trennen
          </button>
        </div>
      )}

      {isSyncing || syncMessage ? (
        <div className="card">
          <div className="label">Sync</div>
          <p>{syncMessage}</p>
          <div className="progress-bar">
            <div style={{ width: `${syncProgress}%` }} />
          </div>
        </div>
      ) : null}

      {error || busyMsg ? <p className="error">{error ?? busyMsg}</p> : null}
    </div>
  );
}
