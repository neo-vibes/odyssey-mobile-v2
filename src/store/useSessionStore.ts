/**
 * Session Store - Zustand store for managing spending sessions
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Session, SessionStoreState } from '../types';

const SESSIONS_STORAGE_KEY = 'odyssey_sessions';

interface SessionStoreActions {
  loadSessions: () => Promise<void>;
  addSession: (session: Session) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<Session>) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  removeSessionsForAgent: (agentId: string) => Promise<void>;
  getSessionsForAgent: (agentId: string) => Session[];
  clearError: () => void;
}

type SessionStore = SessionStoreState & SessionStoreActions;

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  sessions: [],
  pendingRequests: [],
  isLoading: false,
  error: null,

  // Actions
  loadSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const stored = await SecureStore.getItemAsync(SESSIONS_STORAGE_KEY);
      if (stored) {
        const sessions = JSON.parse(stored) as Session[];
        // Update expired sessions
        const now = Date.now();
        const updatedSessions = sessions.map((s) => {
          if (s.status === 'active' && s.expiresAt < now) {
            return { ...s, status: 'expired' as const };
          }
          return s;
        });
        set({ sessions: updatedSessions, isLoading: false });
        // Persist if any sessions were updated
        if (JSON.stringify(sessions) !== JSON.stringify(updatedSessions)) {
          await SecureStore.setItemAsync(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
        }
      } else {
        set({ sessions: [], isLoading: false });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load sessions',
      });
    }
  },

  addSession: async (session: Session) => {
    const { sessions } = get();
    // Check for duplicate
    if (sessions.some((s) => s.id === session.id)) {
      set({ error: 'Session already exists' });
      return;
    }

    const updatedSessions = [...sessions, session];
    try {
      await SecureStore.setItemAsync(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
      set({ sessions: updatedSessions, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save session' });
    }
  },

  updateSession: async (sessionId: string, updates: Partial<Session>) => {
    const { sessions } = get();
    const updatedSessions = sessions.map((s) => (s.id === sessionId ? { ...s, ...updates } : s));

    try {
      await SecureStore.setItemAsync(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
      set({ sessions: updatedSessions });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update session' });
    }
  },

  removeSession: async (sessionId: string) => {
    const { sessions } = get();
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);

    try {
      await SecureStore.setItemAsync(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
      set({ sessions: updatedSessions });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove session' });
    }
  },

  removeSessionsForAgent: async (agentId: string) => {
    const { sessions } = get();
    const updatedSessions = sessions.filter((s) => s.agentId !== agentId);

    try {
      await SecureStore.setItemAsync(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
      set({ sessions: updatedSessions });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove sessions' });
    }
  },

  getSessionsForAgent: (agentId: string) => {
    return get().sessions.filter((s) => s.agentId === agentId);
  },

  clearError: () => set({ error: null }),
}));
