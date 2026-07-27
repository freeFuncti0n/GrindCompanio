import { create } from 'zustand';
import { GrinderHttpClient } from '../network/GrinderHttpClient';
import { grinderLiveWs } from '../network/GrinderLiveWsClient';
import { parseSessionFile } from '../parsing/sessionParser';
import type { LiveTelemetry } from '../parsing/types';
import {
  getExistingSessionIds,
  listSessions,
  upsertParsedSession,
} from '../db/database';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const WIFI_HOST_KEY = 'grind.wifiHost';

function loadWifiHost(): string {
  try {
    return localStorage.getItem(WIFI_HOST_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveWifiHost(host: string) {
  try {
    localStorage.setItem(WIFI_HOST_KEY, host);
  } catch {
    /* ignore */
  }
}

const PHASE_IDLE = 0;
const PHASE_COMPLETED = 12;
const PHASE_TIMEOUT = 13;
const PHASE_PURGE_CONFIRM = 16;

function canStartRemote(live: LiveTelemetry | null): boolean {
  if (!live) return true;
  return live.phase_id === PHASE_IDLE && !live.motor_on;
}

function appendLiveChart(
  chart: { t: number; weight: number; flow: number }[],
  telemetry: LiveTelemetry
) {
  const next = [
    ...chart,
    {
      t: chart.length ? chart[chart.length - 1].t + 50 : 0,
      weight: telemetry.weight_g,
      flow: telemetry.flow_g_s,
    },
  ];
  return next.length > 400 ? next.slice(next.length - 400) : next;
}

let httpClient: GrinderHttpClient | null = null;

function getHttpClient(host: string): GrinderHttpClient {
  if (!httpClient || httpClient.getBaseUrl() !== new GrinderHttpClient(host).getBaseUrl()) {
    httpClient = new GrinderHttpClient(host);
  }
  return httpClient;
}

interface GrinderState {
  status: ConnectionStatus;
  wifiHost: string;
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

  setWifiHost: (host: string) => void;
  connectWifi: (host?: string) => Promise<void>;
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

export const useGrinderStore = create<GrinderState>((set, get) => ({
  status: 'disconnected',
  wifiHost: loadWifiHost(),
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

  setWifiHost: (host) => {
    saveWifiHost(host);
    set({ wifiHost: host });
  },

  connectWifi: async (hostArg?: string) => {
    const host = (hostArg ?? get().wifiHost).trim();
    if (!host) {
      set({ status: 'error', error: 'Bitte ESP-IP eingeben' });
      return;
    }
    set({ status: 'connecting', error: null });
    saveWifiHost(host);
    set({ wifiHost: host });
    try {
      const client = getHttpClient(host);
      const status = await client.getStatus();
      set({
        status: 'connected',
        deviceName: status.hostname || 'GrindByWeight',
        systemInfo: `Build ${status.build} · ${status.version} · ${status.ip}`,
        liveSupported: status.live_supported,
        remoteSupported: status.remote_supported,
      });
      await get().enableLive();
    } catch (e) {
      httpClient = null;
      set({
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
        deviceName: null,
        liveSupported: false,
        remoteSupported: false,
      });
    }
  },

  disconnect: async () => {
    await get().disableLive();
    httpClient = null;
    set({
      status: 'disconnected',
      deviceName: null,
      systemInfo: null,
      liveSupported: false,
      remoteSupported: false,
      live: null,
      liveChart: [],
      remoteMessage: null,
    });
  },

  sync: async () => {
    if (get().status !== 'connected') throw new Error('Not connected');
    set({ isSyncing: true, syncMessage: 'Starting sync…', syncProgress: 0 });
    try {
      const client = getHttpClient(get().wifiHost);
      const remoteIds = await client.getSessionIds();
      if (remoteIds.length === 0) {
        set({ isSyncing: false, syncMessage: 'No sessions on device', syncProgress: 100 });
        return { imported: 0, skipped: 0 };
      }
      const existing = await getExistingSessionIds();
      let imported = 0;
      let skipped = 0;
      for (let i = 0; i < remoteIds.length; i++) {
        const id = remoteIds[i];
        const pct = Math.round(((i + 1) / remoteIds.length) * 100);
        if (existing.has(id)) {
          skipped += 1;
          set({ syncMessage: `Skip session ${id}`, syncProgress: pct });
          continue;
        }
        set({ syncMessage: `Importing session ${id}…`, syncProgress: pct });
        const fileData = await client.getSessionBinary(id);
        const parsed = parseSessionFile(new Uint8Array(fileData), id);
        await upsertParsedSession(parsed.session, parsed.events, parsed.measurements);
        imported += 1;
      }
      set({
        isSyncing: false,
        syncMessage: `Done: ${imported} imported, ${skipped} skipped`,
        syncProgress: 100,
      });
      return { imported, skipped };
    } catch (e) {
      set({
        isSyncing: false,
        syncMessage: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },

  enableLive: async () => {
    const client = getHttpClient(get().wifiHost);
    grinderLiveWs.connect(client.getWsUrl(), (telemetry) => {
      const previousPhase = get().live?.phase_id ?? null;
      set((state) => ({
        live: telemetry,
        liveChart: appendLiveChart(state.liveChart, telemetry),
        liveSupported: true,
      }));
      void handleGrindCompletionSync(
        previousPhase,
        telemetry.phase_id,
        () => get().sync(),
        async () => {
          await listSessions();
        }
      );
    });
    set({ liveSupported: true });
  },

  disableLive: async () => {
    grinderLiveWs.disconnect();
    set({ live: null, liveChart: [] });
  },

  startRemoteGrind: async () => {
    const { remoteSupported, live, wifiHost } = get();
    if (!remoteSupported) {
      set({ remoteMessage: 'Remote benötigt WiFi-Firmware' });
      return;
    }
    if (!canStartRemote(live)) {
      set({ remoteMessage: 'Grind läuft bereits' });
      return;
    }
    try {
      await getHttpClient(wifiHost).postLiveStart();
      set({ remoteMessage: null, liveChart: [] });
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },

  stopRemoteGrind: async () => {
    const { remoteSupported, wifiHost } = get();
    if (!remoteSupported) return;
    try {
      await getHttpClient(wifiHost).postLiveStop();
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },

  continueRemotePurge: async () => {
    const { remoteSupported, wifiHost } = get();
    if (!remoteSupported) return;
    try {
      await getHttpClient(wifiHost).postLivePurge();
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },

  returnRemoteIdle: async () => {
    const { remoteSupported, wifiHost } = get();
    if (!remoteSupported) return;
    try {
      await getHttpClient(wifiHost).postLiveIdle();
    } catch (e) {
      set({ remoteMessage: e instanceof Error ? e.message : String(e) });
    }
  },
}));

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

export async function handleGrindCompletionSync(
  prevPhase: number | null,
  currentPhase: number | null,
  syncFn: () => Promise<{ imported: number; skipped: number }>,
  refreshSessions: () => Promise<void>,
  retryDelaysMs: readonly number[] = [500, 1000, 2000]
): Promise<void> {
  const finished = currentPhase === PHASE_COMPLETED || currentPhase === PHASE_TIMEOUT;
  const wasActive =
    prevPhase != null &&
    prevPhase !== PHASE_IDLE &&
    prevPhase !== PHASE_COMPLETED &&
    prevPhase !== PHASE_TIMEOUT;
  if (finished && wasActive) {
    try {
      for (let attempt = 0; ; attempt += 1) {
        const result = await syncFn();
        if (result.imported > 0 || attempt === retryDelaysMs.length) break;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, retryDelaysMs[attempt]);
        });
      }
      await refreshSessions();
    } catch {
      /* ignore */
    }
  }
}
