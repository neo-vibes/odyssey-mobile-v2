/**
 * Agent Store - Zustand store for managing paired agents
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Agent, AgentStoreState } from '../types';

const AGENTS_STORAGE_KEY = 'odyssey_agents';

interface AgentStoreActions {
  loadAgents: () => Promise<void>;
  addAgent: (agent: Agent) => Promise<void>;
  updateAgentStatus: (agentId: string, status: Agent['status']) => Promise<void>;
  updateAgentLastSeen: (agentId: string, lastSeen: number) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
  clearError: () => void;
}

type AgentStore = AgentStoreState & AgentStoreActions;

export const useAgentStore = create<AgentStore>((set, get) => ({
  // Initial state
  agents: [],
  isLoading: false,
  error: null,

  // Actions
  loadAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const stored = await SecureStore.getItemAsync(AGENTS_STORAGE_KEY);
      if (stored) {
        const agents = JSON.parse(stored) as Agent[];
        set({ agents, isLoading: false });
      } else {
        set({ agents: [], isLoading: false });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load agents',
      });
    }
  },

  addAgent: async (agent: Agent) => {
    const { agents } = get();
    // Check for duplicate
    if (agents.some((a) => a.id === agent.id)) {
      set({ error: 'Agent already paired' });
      return;
    }

    const updatedAgents = [...agents, agent];
    try {
      await SecureStore.setItemAsync(AGENTS_STORAGE_KEY, JSON.stringify(updatedAgents));
      set({ agents: updatedAgents, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save agent' });
    }
  },

  updateAgentStatus: async (agentId: string, status: Agent['status']) => {
    const { agents } = get();
    const updatedAgents = agents.map((a) => (a.id === agentId ? { ...a, status } : a));

    try {
      await SecureStore.setItemAsync(AGENTS_STORAGE_KEY, JSON.stringify(updatedAgents));
      set({ agents: updatedAgents });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update agent' });
    }
  },

  updateAgentLastSeen: async (agentId: string, lastSeen: number) => {
    const { agents } = get();
    const updatedAgents = agents.map((a) => (a.id === agentId ? { ...a, lastSeen } : a));

    try {
      await SecureStore.setItemAsync(AGENTS_STORAGE_KEY, JSON.stringify(updatedAgents));
      set({ agents: updatedAgents });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update agent' });
    }
  },

  removeAgent: async (agentId: string) => {
    const { agents } = get();
    const updatedAgents = agents.filter((a) => a.id !== agentId);

    try {
      await SecureStore.setItemAsync(AGENTS_STORAGE_KEY, JSON.stringify(updatedAgents));
      set({ agents: updatedAgents });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove agent' });
    }
  },

  clearError: () => set({ error: null }),
}));
