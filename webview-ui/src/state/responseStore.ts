/**
 * Zustand store for response state
 */

import { create } from 'zustand';
import type { HttpResponse } from '../vscode';

interface ResponseState {
  response: HttpResponse | null;
  error: string | null;
  setResponse: (response: HttpResponse) => void;
  setError: (error: string) => void;
  clearResponse: () => void;
}

export const useResponseStore = create<ResponseState>((set) => ({
  response: null,
  error: null,

  setResponse: (response) => set({ response, error: null }),

  setError: (error) => set({ error, response: null }),

  clearResponse: () => set({ response: null, error: null }),
}));
