import { create } from 'zustand';
import {
  getLatestSession,
  getSession,
  getSessionEvents,
  getSessionMeasurements,
  listSessions,
} from '../db/database';
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';

interface SessionsState {
  sessions: GrindSession[];
  latest: GrindSession | null;
  selected: GrindSession | null;
  events: GrindEvent[];
  measurements: GrindMeasurement[];
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  loadSession: (sessionId: number) => Promise<void>;
}

export const useSessionsStore = create<SessionsState>((set) => ({
  sessions: [],
  latest: null,
  selected: null,
  events: [],
  measurements: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [sessions, latest] = await Promise.all([listSessions(), getLatestSession()]);
      set({ sessions, latest, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  loadSession: async (sessionId: number) => {
    set({ loading: true, error: null });
    try {
      const [selected, events, measurements] = await Promise.all([
        getSession(sessionId),
        getSessionEvents(sessionId),
        getSessionMeasurements(sessionId),
      ]);
      set({ selected, events, measurements, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
}));
