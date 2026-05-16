/**
 * Zustand store for response state
 */

import { create } from 'zustand';
import type { HttpResponse } from '../vscode';

interface ResponseState {
  response: HttpResponse | null;
  error: string | null;
  errorTime: number | null;
  setResponse: (response: HttpResponse) => void;
  setError: (error: string, time?: number) => void;
  clearResponse: () => void;
}

export const useResponseStore = create<ResponseState>((set) => ({
  response: null,
  error: null,
  errorTime: null,

  setResponse: (response) => set({ response, error: null, errorTime: null }),

  setError: (error, time) => set({ error, errorTime: time ?? null, response: null }),

  clearResponse: () => set({ response: null, error: null, errorTime: null }),
}));
