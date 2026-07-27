import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveTelemetry } from '../parsing/types';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  listSessions: vi.fn(),
}));

vi.mock('../network/GrinderHttpClient', () => ({
  GrinderHttpClient: class {
    private readonly host: string;

    constructor(host: string) {
      this.host = host;
    }

    getBaseUrl() {
      return `http://${this.host}`;
    }

    getWsUrl() {
      return `ws://${this.host}/ws/live`;
    }
  },
}));

vi.mock('../network/GrinderLiveWsClient', () => ({
  grinderLiveWs: {
    connect: mocks.connect,
    disconnect: mocks.disconnect,
  },
}));

vi.mock('../db/database', () => ({
  getExistingSessionIds: vi.fn(),
  listSessions: mocks.listSessions,
  upsertParsedSession: vi.fn(),
}));

import {
  handleGrindCompletionSync,
  useGrinderStore,
} from './grinderStore';

const originalSync = useGrinderStore.getState().sync;

function telemetry(phaseId: number): LiveTelemetry {
  return {
    weight_g: 18,
    flow_g_s: 0,
    target_g: 18,
    progress_pct: phaseId === 12 ? 100 : 40,
    phase_id: phaseId,
    profile_id: 1,
    grind_mode: 0,
    motor_on: phaseId === 5 ? 1 : 0,
  };
}

describe('grind completion sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGrinderStore.setState({
      status: 'connected',
      wifiHost: 'grinder.local',
      live: null,
      liveChart: [],
      liveSupported: true,
      isSyncing: false,
      sync: originalSync,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects an active-to-completed transition in the global WebSocket handler', async () => {
    const sync = vi.fn().mockResolvedValue({ imported: 1, skipped: 0 });
    useGrinderStore.setState({ sync });
    mocks.listSessions.mockResolvedValue([]);

    await useGrinderStore.getState().enableLive();
    const onTelemetry = mocks.connect.mock.calls[0][1] as (value: LiveTelemetry) => void;

    onTelemetry(telemetry(5));
    onTelemetry(telemetry(12));
    onTelemetry(telemetry(12));

    await vi.waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    expect(mocks.listSessions).toHaveBeenCalledTimes(1);
  });

  it('retries after an empty firmware snapshot and stops once a session is imported', async () => {
    vi.useFakeTimers();
    const sync = vi
      .fn()
      .mockResolvedValueOnce({ imported: 0, skipped: 4 })
      .mockResolvedValueOnce({ imported: 1, skipped: 4 });
    const refreshSessions = vi.fn().mockResolvedValue(undefined);

    const completion = handleGrindCompletionSync(
      5,
      12,
      sync,
      refreshSessions,
      [500, 1000]
    );

    await vi.advanceTimersByTimeAsync(499);
    expect(sync).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await completion;

    expect(sync).toHaveBeenCalledTimes(2);
    expect(refreshSessions).toHaveBeenCalledTimes(1);
  });

  it('bounds retries when the completed session never appears', async () => {
    vi.useFakeTimers();
    const sync = vi.fn().mockResolvedValue({ imported: 0, skipped: 0 });
    const refreshSessions = vi.fn().mockResolvedValue(undefined);

    const completion = handleGrindCompletionSync(
      5,
      13,
      sync,
      refreshSessions,
      [500, 1000]
    );

    await vi.runAllTimersAsync();
    await completion;

    expect(sync).toHaveBeenCalledTimes(3);
    expect(refreshSessions).toHaveBeenCalledTimes(1);
  });

  it('does not sync without an active-to-finished transition', async () => {
    const sync = vi.fn().mockResolvedValue({ imported: 1, skipped: 0 });

    await handleGrindCompletionSync(0, 12, sync, vi.fn());
    await handleGrindCompletionSync(12, 12, sync, vi.fn());
    await handleGrindCompletionSync(5, 5, sync, vi.fn());

    expect(sync).not.toHaveBeenCalled();
  });
});
