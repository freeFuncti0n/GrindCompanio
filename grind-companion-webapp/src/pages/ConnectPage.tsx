import { useGrinderStore } from '../store/grinderStore';
import { listSessions } from '../db/database';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

export function ConnectPage() {
  const { t } = useTranslation();
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

  const statusLabel =
    status === 'connected'
      ? t('connect.connected', { device: deviceName ?? 'GrindByWeight' })
      : status === 'connecting'
        ? t('connect.connecting')
        : status === 'error'
          ? t('connect.error')
          : t('connect.disconnected');

  return (
    <div className="page">
      <h1>{t('connect.title')}</h1>
      <p className="muted">
        <Trans i18nKey="connect.wifiHint" components={{ strong: <strong /> }} />
      </p>

      <div className="card">
        <div className="label">{t('common.status')}</div>
        <div className="status">{statusLabel}</div>
        {systemInfo ? <pre className="info">{systemInfo}</pre> : null}
        {status === 'connected' ? (
          <p className="muted">
            {t('connect.liveRemote', {
              live: liveSupported ? t('common.active') : t('common.dash'),
              remote: remoteSupported ? t('common.ready') : t('connect.remoteFirmware'),
            })}
          </p>
        ) : null}
      </div>

      {status !== 'connected' ? (
        <div className="card">
          <label className="label" htmlFor="esp-ip">
            {t('connect.grinderIp')}
          </label>
          <input
            id="esp-ip"
            className="input"
            value={wifiHost}
            placeholder="192.168.1.42"
            onChange={(e) => setWifiHost(e.target.value)}
            autoComplete="off"
          />
          <p className="hint">{t('connect.ipHint')}</p>
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
              {t('connect.connectWifi')}
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
            {t('connect.syncSessions')}
          </button>
          <button className="btn" type="button" disabled={busy} onClick={() => void disconnect()}>
            {t('connect.disconnect')}
          </button>
        </div>
      )}

      {isSyncing || syncMessage ? (
        <div className="card">
          <div className="label">{t('connect.sync')}</div>
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
