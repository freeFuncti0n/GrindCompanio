import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ProgressArc } from '@/src/components/ProgressArc';
import { WeightDisplay } from '@/src/components/WeightDisplay';
import { SessionChart } from '@/src/components/SessionChart';
import { useResponsive } from '@/src/hooks/useResponsive';
import {
  handleGrindCompletionSync,
  isGrindActivePhase,
  isPurgeConfirmPhase,
  useBleStore,
} from '@/src/store/bleStore';
import { useSessionsStore } from '@/src/store/sessionsStore';
import {
  PHASE_COMPLETED,
  PHASE_IDLE,
  PHASE_TIMEOUT,
} from '@/src/ble/uuids';
import { PHASE_NAMES, PROFILE_MAP, MODE_MAP } from '@/src/parsing/types';
import { theme } from '@/src/theme';

type ViewMode = 'arc' | 'chart';

export default function GrindScreen() {
  const router = useRouter();
  const { arcSize, chartWidth } = useResponsive();
  const [viewMode, setViewMode] = useState<ViewMode>('arc');
  const prevPhaseRef = useRef<number | null>(null);

  const status = useBleStore((s) => s.status);
  const live = useBleStore((s) => s.live);
  const liveSupported = useBleStore((s) => s.liveSupported);
  const remoteSupported = useBleStore((s) => s.remoteSupported);
  const liveChart = useBleStore((s) => s.liveChart);
  const remoteMessage = useBleStore((s) => s.remoteMessage);
  const startRemoteGrind = useBleStore((s) => s.startRemoteGrind);
  const stopRemoteGrind = useBleStore((s) => s.stopRemoteGrind);
  const continueRemotePurge = useBleStore((s) => s.continueRemotePurge);
  const returnRemoteIdle = useBleStore((s) => s.returnRemoteIdle);
  const clearRemoteMessage = useBleStore((s) => s.clearRemoteMessage);
  const sync = useBleStore((s) => s.sync);
  const isSyncing = useBleStore((s) => s.isSyncing);

  const { latest, refresh } = useSessionsStore();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const currentPhase = live?.phase_id ?? null;
    void handleGrindCompletionSync(
      prevPhaseRef.current,
      currentPhase,
      sync,
      refresh
    );
    if (
      currentPhase === PHASE_COMPLETED ||
      currentPhase === PHASE_TIMEOUT
    ) {
      void returnRemoteIdle();
    }
    prevPhaseRef.current = currentPhase;
  }, [live?.phase_id, sync, refresh, returnRemoteIdle]);

  const connected = status === 'connected';
  const isLive = Boolean(live && liveSupported);
  const phaseId = isLive ? live!.phase_id : undefined;
  const purgeConfirm = isPurgeConfirmPhase(phaseId);
  const grindActive = isGrindActivePhase(phaseId);
  const canStart =
    connected &&
    remoteSupported &&
    (phaseId == null || phaseId === PHASE_IDLE) &&
    !live?.motor_on;
  const canStop = connected && remoteSupported && grindActive && !purgeConfirm;
  const showCompleteActions =
    connected &&
    remoteSupported &&
    (phaseId === PHASE_COMPLETED || phaseId === PHASE_TIMEOUT);

  const accent =
    (live?.grind_mode ?? latest?.grind_mode) === 1
      ? theme.colors.accent
      : theme.colors.primary;

  const weight = isLive ? live!.weight_g : latest?.final_weight ?? 0;
  const target = isLive ? live!.target_g : latest?.target_weight ?? null;
  const progress = isLive
    ? live!.progress_pct
    : target && target > 0 && latest
      ? Math.min(100, Math.round((latest.final_weight / target) * 100))
      : 0;

  const profileName = useMemo(() => {
    const id = isLive ? live!.profile_id : latest?.profile_id ?? 0;
    return PROFILE_MAP[id] ?? '—';
  }, [isLive, live, latest]);

  const phaseLabel = isLive
    ? PHASE_NAMES[live!.phase_id] ?? `Phase ${live!.phase_id}`
    : latest
      ? latest.result_status || MODE_MAP[latest.grind_mode] || 'Letzte Session'
      : 'Keine Daten';

  const connectionLabel = useMemo(() => {
    if (!connected) return 'Nicht verbunden';
    if (purgeConfirm) return 'Purge bestätigen';
    if (remoteSupported && grindActive) return 'Remote · Grind aktiv';
    if (liveSupported) {
      return isLive && live!.motor_on ? 'LIVE · Motor an' : 'LIVE bereit';
    }
    return 'Verbunden · Live nach Firmware-Update';
  }, [connected, purgeConfirm, remoteSupported, grindActive, liveSupported, isLive, live]);

  if (!connected) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.container}>
          <Text style={styles.brand}>GrindByWeight</Text>
          <Text style={styles.offlineTitle}>Grind-Monitor</Text>
          <Text style={styles.offlineText}>
            Verbinde dich mit dem ESP, um Live-Daten zu sehen oder remote zu mahlen.
            Ohne Verbindung zeigt Analytics deine synchronisierten Sessions.
          </Text>
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => router.push('/(tabs)/connect')}>
            <Text style={styles.actionBtnText}>Zu Connect</Text>
          </Pressable>
          {latest ? (
            <View style={styles.lastSessionBox}>
              <Text style={styles.lastSessionLabel}>Letzte Session</Text>
              <Text style={styles.lastSessionValue}>
                {profileName} · {latest.final_weight.toFixed(1)} g
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.brand}>GrindByWeight</Text>
        <Text style={[styles.profile, { color: accent }]}>{profileName}</Text>
        <Text style={styles.phase}>{phaseLabel}</Text>
        <Text style={styles.connection}>{connectionLabel}</Text>

        <Pressable
          style={styles.stage}
          onPress={() => setViewMode((m) => (m === 'arc' ? 'chart' : 'arc'))}>
          {viewMode === 'arc' ? (
            <View style={styles.arcWrap}>
              <ProgressArc size={arcSize} progress={progress} color={accent} />
              <View style={styles.arcCenter}>
                <WeightDisplay weight={weight} target={target} accent={accent} />
              </View>
            </View>
          ) : (
            <SessionChart
              width={chartWidth}
              height={240}
              livePoints={
                isLive
                  ? liveChart.map((p) => ({
                      t: p.t,
                      weight: p.weight,
                      flow: p.flow,
                      motor: live?.motor_on,
                    }))
                  : undefined
              }
            />
          )}
        </Pressable>

        {purgeConfirm ? (
          <View style={styles.purgeBox}>
            <Text style={styles.purgeTitle}>Purge bestätigen</Text>
            <Text style={styles.purgeText}>
              Der Mahlvorgang wartet auf Bestätigung (Prime/Purge-Modus).
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => void continueRemotePurge()}>
                <Text style={styles.actionBtnText}>Weiter</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionDanger]}
                onPress={() => void stopRemoteGrind()}>
                <Text style={styles.actionBtnText}>Abbrechen</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actionRow}>
            {canStart ? (
              <Pressable
                style={[styles.actionBtn, styles.actionPrimary, styles.actionLarge]}
                onPress={() => void startRemoteGrind()}>
                <Text style={styles.actionBtnTextLarge}>Start</Text>
              </Pressable>
            ) : null}
            {canStop ? (
              <Pressable
                style={[styles.actionBtn, styles.actionDanger]}
                onPress={() => void stopRemoteGrind()}>
                <Text style={styles.actionBtnText}>Stop</Text>
              </Pressable>
            ) : null}
            {showCompleteActions ? (
              <Pressable
                style={[styles.actionBtn, styles.actionNeutral]}
                disabled={isSyncing}
                onPress={async () => {
                  try {
                    await sync();
                    await refresh();
                    await returnRemoteIdle();
                  } catch {
                    /* shown in store */
                  }
                }}>
                {isSyncing ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <Text style={styles.actionBtnText}>Sync & Fertig</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}

        {remoteMessage ? (
          <Pressable onPress={clearRemoteMessage}>
            <Text style={styles.remoteMsg}>{remoteMessage}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.hint}>
          Tippen: Arc ↔ Chart ·{' '}
          {isLive
            ? 'Live-Daten vom ESP'
            : liveSupported
              ? 'Live aktiv — warte auf Grind'
              : latest
                ? 'Letzte Session (Live braucht Firmware-Update)'
                : 'Sync unter Connect'}
          {!remoteSupported ? ' · Remote-Start nach Firmware-Update' : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  brand: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: theme.colors.secondary,
    marginBottom: 12,
  },
  profile: {
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.profile,
  },
  phase: {
    marginTop: 4,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  connection: {
    marginTop: 8,
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.accent,
  },
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    borderRadius: theme.radii.button,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  actionLarge: {
    minWidth: 160,
    paddingVertical: 18,
  },
  actionPrimary: { backgroundColor: theme.colors.primary },
  actionDanger: { backgroundColor: theme.colors.error },
  actionNeutral: { backgroundColor: theme.colors.neutral },
  actionBtnText: {
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  actionBtnTextLarge: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  purgeBox: {
    width: '100%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  purgeTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  purgeText: {
    marginTop: 6,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  remoteMsg: {
    marginBottom: 8,
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.error,
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
    color: theme.colors.neutral,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  offlineTitle: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 22,
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  offlineText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  lastSessionBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lastSessionLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.secondary,
    textTransform: 'uppercase',
  },
  lastSessionValue: {
    marginTop: 6,
    fontFamily: theme.fonts.semiBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
});
