/**
 * Message types for communication between extension host and runner webview
 */

import type { HttpRequest } from './request';
import type { RunConfig, RunRequestResult, RunState, RunSummary } from './runner';

// Extension -> Runner Webview messages
export type RunnerExtensionToWebviewMessage =
    | { type: 'runnerLoadRequests'; requests: RunnerRequestInfo[]; activeEnvironmentName?: string; collectionName: string; folderName?: string }
    | { type: 'runnerInit'; state: RunState }
    | { type: 'runnerRequestStarted'; index: number }
    | { type: 'runnerRequestCompleted'; index: number; result: RunRequestResult }
    | { type: 'runnerCompleted'; summary: RunSummary; endTime: number }
    | { type: 'runnerCancelled' };

// Runner Webview -> Extension messages
export type RunnerWebviewToExtensionMessage =
    | { type: 'runnerReady' }
    | { type: 'runnerStart'; config: RunConfig }
    | { type: 'runnerCancel' }
    | { type: 'runnerViewRequest'; requestId: string }
    | { type: 'runnerRerun' }
    | { type: 'runnerNewConfig' };

/** Simplified request info sent to the runner config UI */
export interface RunnerRequestInfo {
    id: string;
    name: string;
    method: string;
    url: string;
    folderId?: string;
    folderPath?: string;
}

export type RunnerMessage = RunnerExtensionToWebviewMessage | RunnerWebviewToExtensionMessage;
