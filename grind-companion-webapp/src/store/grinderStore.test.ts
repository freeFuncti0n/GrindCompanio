import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getExistingSessionIds: vi.fn(),
  getSessionBinary: vi.fn(),
  getSessionIds: vi.fn(),
  parseSessionFile: vi.fn(),
  upsertParsedSession: vi.fn(),
}));

vi.mock('../network/GrinderHttpClient', () => ({
  GrinderHttpClient: class {
    constructor(private readonly host: string) {}

    getBaseUrl() {
      return `http://${this.host}`;
    }

    getSessionIds = mocks.getSessionIds;
    getSessionBinary = mocks.getSessionBinary;
  },
}));

vi.mock('../network/GrinderLiveWsClient', () => ({
  grinderLiveWs: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('../parsing/sessionParser', () => ({
  parseSessionFile: mocks.parseSessionFile,
}));

vi.mock('../db/database', () => ({
  getExistingSessionIds: mocks.getExistingSessionIds,
  upsertParsedSession: mocks.upsertParsedSession,
}));

import { useGrinderStore } from './grinderStore';

describe('grinder session sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGrinderStore.setState({
      status: 'connected',
      wifiHost: 'grinder.local',
      syncMessage: null,
      syncProgress: 0,
      isSyncing: false,
    });

    mocks.getSessionIds.mockResolvedValue([1, 2, 3]);
    mocks.getExistingSessionIds.mockResolvedValue(new Set<number>());
    mocks.getSessionBinary.mockResolvedValue(new ArrayBuffer(1));
    mocks.parseSessionFile.mockImplementation(
      (_data: Uint8Array, sessionId: number) => {
        if (sessionId === 2) {
          throw new Error('Session 2 is corrupted');
        }
        return {
          session: { session_id: sessionId },
          events: [],
          measurements: [],
        };
      }
    );
    mocks.upsertParsedSession.mockResolvedValue(undefined);
  });

  it('continues importing after one remote session is corrupted', async () => {
    await expect(useGrinderStore.getState().sync()).resolves.toEqual({
      imported: 2,
      skipped: 0,
    });

    expect(mocks.getSessionBinary).toHaveBeenCalledTimes(3);
    expect(mocks.upsertParsedSession).toHaveBeenCalledTimes(2);
    expect(mocks.upsertParsedSession).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ session_id: 3 }),
      [],
      []
    );
    expect(useGrinderStore.getState().syncMessage).toBe(
      'Done: 2 imported, 0 skipped, 1 failed (session 2)'
    );
    expect(useGrinderStore.getState().syncProgress).toBe(100);
    expect(useGrinderStore.getState().isSyncing).toBe(false);
  });
});
