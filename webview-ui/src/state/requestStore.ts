/**
 * Zustand store for request state
 */

import { create } from 'zustand';
import type { HttpRequest } from '../vscode';

interface RequestState {
  request: HttpRequest | null;
  isLoading: boolean;
  setRequest: (request: HttpRequest) => void;
  updateRequest: (updates: Partial<HttpRequest>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialRequest: HttpRequest = {
  id: '',
  name: 'New Request',
  method: 'GET',
  url: '',
  headers: [],
  queryParams: [],
  body: { type: 'none', content: '' },
  auth: { type: 'none' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const useRequestStore = create<RequestState>((set) => ({
  request: initialRequest,
  isLoading: false,

  setRequest: (request) => set({ request }),

  updateRequest: (updates) =>
    set((state) => ({
      request: state.request
        ? { ...state.request, ...updates, updatedAt: Date.now() }
        : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set({ request: initialRequest, isLoading: false }),
}));
