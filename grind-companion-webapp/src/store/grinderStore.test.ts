import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGrinderStore } from './grinderStore';

const fetchMock = vi.fn<typeof fetch>();

function liveState(overrides: Partial<Record<string, number | boolean>> = {}) {
  return {
    active: false,
    weight_g: 0,
    flow_g_s: 0,
    target_g: 18,
    progress: 0,
    phase_id: 0,
    profile_id: 1,
    grind_mode: 0,
    motor_on: 0,
    ...overrides,
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

describe('startRemoteGrind', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    useGrinderStore.setState({
      status: 'connected',
      wifiHost: '192.168.1.42',
      remoteSupported: true,
      remoteMessage: null,
      liveChart: [{ t: 0, weight: 18, flow: 0 }],
      live: {
        weight_g: 18,
        flow_g_s: 0,
        target_g: 18,
        progress_pct: 100,
        phase_id: 12,
        profile_id: 1,
        grind_mode: 0,
        motor_on: 0,
      },
    });
  });

  it('starts after the device returned to idle despite stale completed telemetry', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(liveState()))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await useGrinderStore.getState().startRemoteGrind();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://192.168.1.42:8080/api/live/state',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://192.168.1.42:8080/api/live/start',
      { method: 'POST' }
    );
    expect(useGrinderStore.getState()).toMatchObject({
      remoteMessage: null,
      live: { phase_id: 0, progress_pct: 0 },
      liveChart: [],
    });
  });

  it('does not start when the fresh device state is active', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(liveState({ active: true, phase_id: 5, motor_on: 1 }))
    );

    await useGrinderStore.getState().startRemoteGrind();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useGrinderStore.getState()).toMatchObject({
      remoteMessage: 'Grind läuft bereits',
      live: { phase_id: 5, motor_on: 1 },
    });
  });
});
