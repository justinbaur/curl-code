/**
 * VS Code API wrapper for runner webview communication
 */

// Runner-specific message types (mirrored from src/types/runnerMessages.ts)

export type RunRequestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type RunStatus = 'idle' | 'running' | 'completed' | 'cancelled';

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  size: number;
  time: number;
  curlCommand: string;
  debugLog?: string;
}

export interface RunRequestResult {
  requestId: string;
  requestName: string;
  method: string;
  url: string;
  status: RunRequestStatus;
  statusCode?: number;
  statusText?: string;
  responseTime?: number;
  error?: string;
  response?: HttpResponse;
}

export interface RunConfig {
  delayMs: number;
  stopOnError: boolean;
  persistResponses: boolean;
  collectionId: string;
  collectionName: string;
  folderId?: string;
  folderName?: string;
  selectedRequestIds: string[];
}

export interface RunState {
  id: string;
  config: RunConfig;
  status: RunStatus;
  requests: RunRequestResult[];
  currentIndex: number;
  startTime: number;
  endTime?: number;
  summary?: RunSummary;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  totalTime: number;
  avgResponseTime: number;
}

export interface RunnerRequestInfo {
  id: string;
  name: string;
  method: string;
  url: string;
  folderId?: string;
  folderPath?: string;
}

// Extension -> Webview messages
export type RunnerExtensionMessage =
  | { type: 'runnerLoadRequests'; requests: RunnerRequestInfo[]; activeEnvironmentName?: string; collectionName: string; folderName?: string }
  | { type: 'runnerInit'; state: RunState }
  | { type: 'runnerRequestStarted'; index: number }
  | { type: 'runnerRequestCompleted'; index: number; result: RunRequestResult }
  | { type: 'runnerCompleted'; summary: RunSummary; endTime: number }
  | { type: 'runnerCancelled' };

// Webview -> Extension messages
export type RunnerWebviewMessage =
  | { type: 'runnerReady' }
  | { type: 'runnerStart'; config: RunConfig }
  | { type: 'runnerCancel' }
  | { type: 'runnerViewRequest'; requestId: string }
  | { type: 'runnerRerun' }
  | { type: 'runnerNewConfig' };

// VS Code API interface
interface VSCodeApi {
  postMessage(message: RunnerWebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

class RunnerVSCodeAPIWrapper {
  private readonly vsCodeApi: VSCodeApi | undefined;

  constructor() {
    if (typeof acquireVsCodeApi === 'function') {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  public postMessage(message: RunnerWebviewMessage): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log('VS Code API not available, message:', message);
    }
  }

  public onMessage(callback: (message: RunnerExtensionMessage) => void): () => void {
    const handler = (event: MessageEvent<RunnerExtensionMessage>) => {
      callback(event.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }
}

export const runnerVscode = new RunnerVSCodeAPIWrapper();
