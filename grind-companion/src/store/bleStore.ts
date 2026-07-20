import { create } from 'zustand';
import { grinderBle, type ScanDevice } from '../ble/GrinderBleClient';
import {
  BLE_LIVE_CMD_CONTINUE_PURGE,
  BLE_LIVE_CMD_RETURN_IDLE,
  BLE_LIVE_CMD_START_GRIND,
  BLE_LIVE_CMD_STOP_GRIND,
  PHASE_COMPLETED,
  PHASE_IDLE,
  PHASE_PURGE_CONFIRM,
  PHASE_TIMEOUT,
} from '../ble/uuids';
import type { LiveTelemetry } from '../parsing/types';

export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

interface BleState {
  status: ConnectionStatus;
  devices: ScanDevice[];
  deviceId: string | null;
  deviceName: string | null;
  error: string | null;
  syncMessage: string | null;
  syncProgress: number;
  isSyncing: boolean;
  systemInfo: string | null;
  liveSupported: boolean;
  remoteSupported: boolean;
  live: LiveTelemetry | null;
  liveChart: { t: number; weight: number; flow: number }[];
  remoteMessage: string | null;

  scan: () => Promise<void>;
  connect: (deviceId?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  sync: () => Promise<{ imported: number; skipped: number }>;
  enableLive: () => Promise<void>;
  disableLive: () => Promise<void>;
  startRemoteGrind: () => Promise<void>;
  stopRemoteGrind: () => Promise<void>;
  continueRemotePurge: () => Promise<void>;
  returnRemoteIdle: () => Promise<void>;
  clearError: () => void;
  clearRemoteMessage: () => void;
}

function canStartRemote(live: LiveTelemetry | null): boolean {
  if (!live) return true;
  return live.phase_id === PHASE_IDLE && !live.motor_on;
}

export const useBleStore = create<BleState>((set, get) => ({
  status: 'disconnected',
  devices: [],
  deviceId: null,
  deviceName: null,
  error: null,
  syncMessage: null,
  syncProgress: 0,
  isSyncing: false,
  systemInfo: null,
  liveSupported: false,
  remoteSupported: false,
  live: null,
  liveChart: [],
  remoteMessage: null,

  clearError: () => set({ error: null }),
  clearRemoteMessage: () => set({ remoteMessage: null }),

  scan: async () => {
    set({ status: 'scanning', error: null, devices: [] });
    try {
      const devices = await grinderBle.scan(8000);
      set({
        devices,
        status: grinderBle.isConnected() ? 'connected' : 'disconnected',
      });
    } catch (e) {
      set({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  connect: async (deviceId?: string) => {
    set({ status: 'connecting', error: null });
    try {
      const device = await grinderBle.connect(deviceId);
      const systemInfo = await grinderBle.readSystemInfo();
      const features = await grinderBle.detectFeatures();
      set({
        status: 'connected',
        deviceId: device.id,
        deviceName: device.name ?? device.localName ?? 'GrindByWeight',
        systemInfo,
        liveSupported: features.liveSupported,
        remoteSupported: features.remoteSupported,
      });
      if (features.liveSupported) {
        await get().enableLive();
      }
    } catch (e) {
      set({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
        deviceId: null,
        liveSupported: false,
        remoteSupported: false,
      });
    }
  },

  disconnect: async () => {
    await get().disableLive();
    await grinderBle.disconnect();
    set({
      status: 'disconnected',
      deviceId: null,
      deviceName: null,
      live: null,
      liveSupported: false,
      remoteSupported: false,
      liveChart: [],
      remoteMessage: null,
    });
  },

  sync: async () => {
    if (!grinderBle.isConnected()) {
      throw new Error('Not connected');
    }
    set({ isSyncing: true, syncMessage: 'Starting sync…', syncProgress: 0 });
    try {
      const result = await grinderBle.syncSessions((message, progress) => {
        set({ syncMessage: message, syncProgress: progress ?? 0 });
      });
      set({ isSyncing: false });
      return result;
    } catch (e) {
      set({
        isSyncing: false,
        syncMessage: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  enableLive: async () => {
    if (!get().liveSupported) {
      set({ liveSupported: false });
      return;
    }
    const ok = await grinderBle.enableLiveStream((telemetry) => {
      set((state) => {
        const point = {
          t: Date.now(),
          weight: telemetry.weight_g,
          flow: telemetry.flow_g_s,
        };
        const prev = state.liveChart;
        const shouldReset =
          prev.length > 0 && Date.now() - prev[prev.length - 1].t > 5000;
        const liveChart = shouldReset
          ? [point]
          : [...prev, point].slice(-120);
        return { live: telemetry, liveChart, liveSupported: true };
      });
    });
    set({ liveSupported: ok });
  },

  disableLive: async () => {
    await grinderBle.disableLiveStream();
    set({ live: null, liveChart: [] });
  },

  startRemoteGrind: async () => {
    const { remoteSupported, live } = get();
    if (!remoteSupported) {
      set({ remoteMessage: 'Remote-Start benötigt Firmware-Update' });
      return;
    }
    if (!canStartRemote(live)) {
      set({ remoteMessage: 'Grind läuft bereits' });
      return;
    }
    try {
      await grinderBle.sendLiveCommand(BLE_LIVE_CMD_START_GRIND);
      set({ remoteMessage: null, liveChart: [] });
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },

  stopRemoteGrind: async () => {
    if (!get().remoteSupported) return;
    try {
      await grinderBle.sendLiveCommand(BLE_LIVE_CMD_STOP_GRIND);
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },

  continueRemotePurge: async () => {
    if (!get().remoteSupported) return;
    try {
      await grinderBle.sendLiveCommand(BLE_LIVE_CMD_CONTINUE_PURGE);
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },

  returnRemoteIdle: async () => {
    if (!get().remoteSupported) return;
    try {
      await grinderBle.sendLiveCommand(BLE_LIVE_CMD_RETURN_IDLE);
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },
}));

/** Auto-sync after grind completes (call from Grind screen effect). */
export async function handleGrindCompletionSync(
  prevPhase: number | null,
  currentPhase: number | null,
  syncFn: () => Promise<{ imported: number; skipped: number }>,
  refreshSessions: () => Promise<void>
): Promise<void> {
  const finished =
    currentPhase === PHASE_COMPLETED || currentPhase === PHASE_TIMEOUT;
  const wasActive =
    prevPhase != null &&
    prevPhase !== PHASE_IDLE &&
    prevPhase !== PHASE_COMPLETED &&
    prevPhase !== PHASE_TIMEOUT;
  if (finished && wasActive) {
    try {
      await syncFn();
      await refreshSessions();
    } catch {
      /* sync errors surface in connect tab */
    }
  }
}

export function isPurgeConfirmPhase(phaseId: number | undefined): boolean {
  return phaseId === PHASE_PURGE_CONFIRM;
}

export function isGrindActivePhase(phaseId: number | undefined): boolean {
  if (phaseId == null) return false;
  return (
    phaseId !== PHASE_IDLE &&
    phaseId !== PHASE_COMPLETED &&
    phaseId !== PHASE_TIMEOUT
  );
}
