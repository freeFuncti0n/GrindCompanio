import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  handleGrindCompletionSync,
  isGrindActivePhase,
  isPurgeConfirmPhase,
  useGrinderStore,
} from '../store/grinderStore';
import { listSessions } from '../db/database';
import { ProgressArc } from '../components/ProgressArc';
import { SessionChart } from '../components/SessionChart';
import { useEnumLabels } from '../i18n/useEnumLabels';

export function GrindPage() {
  const { t } = useTranslation();
  const { phase } = useEnumLabels();
  const status = useGrinderStore((s) => s.status);
  const live = useGrinderStore((s) => s.live);
  const liveChart = useGrinderStore((s) => s.liveChart);
  const liveSupported = useGrinderStore((s) => s.liveSupported);
  const remoteSupported = useGrinderStore((s) => s.remoteSupported);
  const remoteMessage = useGrinderStore((s) => s.remoteMessage);
  const startRemoteGrind = useGrinderStore((s) => s.startRemoteGrind);
  const stopRemoteGrind = useGrinderStore((s) => s.stopRemoteGrind);
  const continueRemotePurge = useGrinderStore((s) => s.continueRemotePurge);
  const returnRemoteIdle = useGrinderStore((s) => s.returnRemoteIdle);
  const sync = useGrinderStore((s) => s.sync);
  const clearRemoteMessage = useGrinderStore((s) => s.clearRemoteMessage);

  const [prevPhase, setPrevPhase] = useState<number | null>(null);
  const connected = status === 'connected';
  const phaseId = live?.phase_id;
  const purgeConfirm = isPurgeConfirmPhase(phaseId);
  const grindActive = isGrindActivePhase(phaseId);
  const progress = live?.progress_pct ?? 0;
  const weight = live?.weight_g ?? 0;
  const target = live?.target_g ?? 0;
  const flow = live?.flow_g_s ?? 0;

  useEffect(() => {
    if (phaseId == null) return;
    void handleGrindCompletionSync(prevPhase, phaseId, sync, async () => {
      await listSessions();
    });
    setPrevPhase(phaseId);
  }, [phaseId, prevPhase, sync]);

  if (!connected) {
    return (
      <div className="page">
        <h1>{t('grind.title')}</h1>
        <p className="muted">
          <Trans
            i18nKey="grind.notConnected"
            components={{ link: <Link to="/connect" /> }}
          />
        </p>
      </div>
    );
  }

  const phaseSuffix =
    live != null ? ` · ${phase(live.phase_id)}` : '';

  return (
    <div className="page grind-page">
      <h1>{t('grind.title')}</h1>
      <p className="muted">
        {t('grind.liveRemote', {
          live: liveSupported ? 'WebSocket' : t('common.dash'),
          remote: remoteSupported ? t('common.ready') : t('grind.remoteFirmware'),
          phase: phaseSuffix,
        })}
      </p>

      <div className="arc-wrap">
        <ProgressArc progress={progress} />
        <div className="arc-center">
          <div className="weight">{weight.toFixed(1)} g</div>
          <div className="muted">
            {t('grind.targetFlow', { target: target.toFixed(1), flow: flow.toFixed(2) })}
          </div>
        </div>
      </div>

      <SessionChart points={liveChart} />

      {remoteMessage ? (
        <p className="error" onClick={() => clearRemoteMessage()}>
          {remoteMessage}
        </p>
      ) : null}

      <div className="actions">
        {purgeConfirm ? (
          <button className="btn primary" type="button" onClick={() => void continueRemotePurge()}>
            {t('grind.confirmPurge')}
          </button>
        ) : null}
        {!grindActive ? (
          <button
            className="btn primary"
            type="button"
            disabled={!remoteSupported}
            onClick={() => void startRemoteGrind()}
          >
            {t('grind.start')}
          </button>
        ) : (
          <button className="btn danger" type="button" onClick={() => void stopRemoteGrind()}>
            {t('grind.stop')}
          </button>
        )}
        {(phaseId === 12 || phaseId === 13) && (
          <button className="btn" type="button" onClick={() => void returnRemoteIdle()}>
            {t('grind.idle')}
          </button>
        )}
      </div>
    </div>
  );
}
