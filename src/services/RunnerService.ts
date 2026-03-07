/**
 * Service for orchestrating collection runner execution
 */

import type { HttpRequest } from '../types/request';
import type { Collection, Folder } from '../types/collection';
import type { RunConfig, RunRequestResult, RunState, RunSummary } from '../types/runner';
import { generateRunId } from '../types/runner';
import type { RunnerExtensionToWebviewMessage } from '../types/runnerMessages';
import type { CurlExecutor } from '../curl/executor';
import type { HistoryService } from './HistoryService';

export class RunnerService {
    private aborted = false;
    private running = false;
    private executor: CurlExecutor;
    private historyService: HistoryService;

    constructor(executor: CurlExecutor, historyService: HistoryService) {
        this.executor = executor;
        this.historyService = historyService;
    }

    /**
     * Collect all requests from a collection or a specific folder within it.
     * Uses depth-first traversal to match tree display order.
     */
    collectRequests(collection: Collection, folderId?: string): HttpRequest[] {
        if (folderId) {
            const folder = this.findFolder(collection.folders, folderId);
            if (!folder) return [];
            return this.flattenFolder(folder);
        }

        const requests: HttpRequest[] = [...collection.requests];
        for (const folder of collection.folders) {
            requests.push(...this.flattenFolder(folder));
        }
        return requests;
    }

    /**
     * Start a collection run. Calls onUpdate for each state transition.
     */
    async startRun(
        config: RunConfig,
        allRequests: HttpRequest[],
        onUpdate: (msg: RunnerExtensionToWebviewMessage) => void
    ): Promise<RunState> {
        if (this.running) {
            throw new Error('A run is already in progress');
        }

        this.running = true;
        this.aborted = false;

        // Filter to selected requests only
        const selectedSet = new Set(config.selectedRequestIds);
        const requests = allRequests.filter(r => selectedSet.has(r.id));

        const state: RunState = {
            id: generateRunId(),
            config,
            status: 'running',
            requests: requests.map(r => ({
                requestId: r.id,
                requestName: r.name,
                method: r.method,
                url: r.url,
                status: 'pending',
            })),
            currentIndex: -1,
            startTime: Date.now(),
        };

        onUpdate({ type: 'runnerInit', state });

        const responseTimes: number[] = [];

        for (let i = 0; i < requests.length; i++) {
            if (this.aborted) {
                // Mark remaining as skipped
                for (let j = i; j < requests.length; j++) {
                    state.requests[j].status = 'skipped';
                }
                break;
            }

            state.currentIndex = i;
            state.requests[i].status = 'running';
            onUpdate({ type: 'runnerRequestStarted', index: i });

            const request = requests[i];
            let result: RunRequestResult;

            try {
                const response = await this.executor.execute(request);
                result = {
                    requestId: request.id,
                    requestName: request.name,
                    method: request.method,
                    url: request.url,
                    status: 'passed',
                    statusCode: response.status,
                    statusText: response.statusText,
                    responseTime: response.time,
                    response: config.persistResponses ? response : undefined,
                };
                responseTimes.push(response.time);
                await this.historyService.addEntry(request, response);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                result = {
                    requestId: request.id,
                    requestName: request.name,
                    method: request.method,
                    url: request.url,
                    status: 'failed',
                    error: errorMessage,
                };
                await this.historyService.addEntry(request, undefined, errorMessage);
            }

            state.requests[i] = result;
            onUpdate({ type: 'runnerRequestCompleted', index: i, result });

            // Stop on error if configured
            if (config.stopOnError && result.status === 'failed') {
                for (let j = i + 1; j < requests.length; j++) {
                    state.requests[j].status = 'skipped';
                }
                break;
            }

            // Delay between requests (skip after last)
            if (config.delayMs > 0 && i < requests.length - 1 && !this.aborted) {
                await this.delay(config.delayMs);
            }
        }

        const endTime = Date.now();
        state.endTime = endTime;
        state.status = this.aborted ? 'cancelled' : 'completed';

        const summary = this.computeSummary(state, responseTimes);
        state.summary = summary;

        if (this.aborted) {
            onUpdate({ type: 'runnerCancelled' });
        }
        onUpdate({ type: 'runnerCompleted', summary, endTime });

        this.running = false;
        return state;
    }

    /**
     * Cancel the current run
     */
    cancel(): void {
        if (!this.running) return;
        this.aborted = true;
        this.executor.cancel();
    }

    isRunning(): boolean {
        return this.running;
    }

    private computeSummary(state: RunState, responseTimes: number[]): RunSummary {
        const passed = state.requests.filter(r => r.status === 'passed').length;
        const failed = state.requests.filter(r => r.status === 'failed').length;
        const skipped = state.requests.filter(r => r.status === 'skipped').length;
        const totalTime = (state.endTime || Date.now()) - state.startTime;
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        return {
            total: state.requests.length,
            passed,
            failed,
            skipped,
            totalTime,
            avgResponseTime,
        };
    }

    private findFolder(folders: Folder[], folderId: string): Folder | undefined {
        for (const folder of folders) {
            if (folder.id === folderId) return folder;
            const found = this.findFolder(folder.folders, folderId);
            if (found) return found;
        }
        return undefined;
    }

    private flattenFolder(folder: Folder): HttpRequest[] {
        const requests: HttpRequest[] = [...folder.requests];
        for (const subfolder of folder.folders) {
            requests.push(...this.flattenFolder(subfolder));
        }
        return requests;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
