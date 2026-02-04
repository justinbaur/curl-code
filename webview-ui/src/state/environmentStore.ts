/**
 * Zustand store for environment state
 */

import { create } from 'zustand';
import type { Environment } from '../vscode';

interface EnvironmentStore {
  environments: Environment[];
  activeEnvironmentId: string | undefined;
  setEnvironments: (environments: Environment[], activeId?: string) => void;
  getActiveEnvironment: () => Environment | undefined;
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  activeEnvironmentId: undefined,

  setEnvironments: (environments, activeId) => {
    set({ environments, activeEnvironmentId: activeId });
  },

  getActiveEnvironment: () => {
    const { environments, activeEnvironmentId } = get();
    return environments.find((env) => env.id === activeEnvironmentId);
  },
}));
