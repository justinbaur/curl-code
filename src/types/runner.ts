/**
 * Collection runner type definitions
 */

import type { HttpResponse } from './request';

export type RunRequestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export type RunStatus = 'idle' | 'running' | 'completed' | 'cancelled';

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

export function generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
