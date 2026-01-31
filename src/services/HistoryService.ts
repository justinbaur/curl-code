/**
 * Service for managing request history
 */

import * as vscode from 'vscode';
import type { HttpRequest, HttpResponse, HistoryEntry } from '../types/request';
import { generateId } from '../types/request';

export class HistoryService {
    private static readonly HISTORY_KEY = 'curl-code.history';
    private history: HistoryEntry[] = [];
    private onChangeEmitter = new vscode.EventEmitter<void>();
    readonly onChange = this.onChangeEmitter.event;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Initialize the service and load history
     */
    async initialize(): Promise<void> {
        this.loadHistory();
    }

    /**
     * Get all history entries
     */
    getHistory(): HistoryEntry[] {
        return this.history;
    }

    /**
     * Add an entry to history
     */
    async addEntry(request: HttpRequest, response?: HttpResponse, error?: string): Promise<HistoryEntry> {
        const config = vscode.workspace.getConfiguration('curl-code');
        const saveHistory = config.get<boolean>('saveRequestHistory', true);

        if (!saveHistory) {
            // Return a temporary entry without saving
            return {
                id: generateId(),
                request,
                response,
                error,
                timestamp: Date.now()
            };
        }

        const entry: HistoryEntry = {
            id: generateId(),
            request: { ...request },
            response,
            error,
            timestamp: Date.now()
        };

        // Add to the beginning of history
        this.history.unshift(entry);

        // Trim history to max items
        const maxItems = config.get<number>('maxHistoryItems', 50);
        if (this.history.length > maxItems) {
            this.history = this.history.slice(0, maxItems);
        }

        await this.saveHistory();
        this.onChangeEmitter.fire();

        return entry;
    }

    /**
     * Get a history entry by ID
     */
    getEntry(id: string): HistoryEntry | undefined {
        return this.history.find(e => e.id === id);
    }

    /**
     * Delete a history entry
     */
    async deleteEntry(id: string): Promise<boolean> {
        const index = this.history.findIndex(e => e.id === id);
        if (index === -1) return false;

        this.history.splice(index, 1);
        await this.saveHistory();
        this.onChangeEmitter.fire();
        return true;
    }

    /**
     * Clear all history
     */
    async clearHistory(): Promise<void> {
        this.history = [];
        await this.saveHistory();
        this.onChangeEmitter.fire();
    }

    /**
     * Search history by URL or name
     */
    search(query: string): HistoryEntry[] {
        const lowerQuery = query.toLowerCase();
        return this.history.filter(entry =>
            entry.request.url.toLowerCase().includes(lowerQuery) ||
            entry.request.name.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get recent unique URLs
     */
    getRecentUrls(limit: number = 10): string[] {
        const urls = new Set<string>();
        for (const entry of this.history) {
            urls.add(entry.request.url);
            if (urls.size >= limit) break;
        }
        return Array.from(urls);
    }

    /**
     * Load history from storage
     */
    private loadHistory(): void {
        const stored = this.context.globalState.get<HistoryEntry[]>(HistoryService.HISTORY_KEY);
        this.history = stored || [];
    }

    /**
     * Save history to storage
     */
    private async saveHistory(): Promise<void> {
        await this.context.globalState.update(HistoryService.HISTORY_KEY, this.history);
    }
}
