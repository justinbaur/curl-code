/**
 * Tree data provider for request history
 */

import * as vscode from 'vscode';
import type { HistoryEntry } from '../types/request';
import type { HistoryService } from '../services/HistoryService';

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryEntry> {
    private _onDidChangeTreeData = new vscode.EventEmitter<HistoryEntry | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private historyService: HistoryService) {}

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Get tree item representation
     */
    getTreeItem(element: HistoryEntry): vscode.TreeItem {
        const item = new vscode.TreeItem(
            this.getLabel(element),
            vscode.TreeItemCollapsibleState.None
        );

        item.contextValue = 'historyEntry';
        item.iconPath = this.getStatusIcon(element);
        item.description = this.getDescription(element);
        item.tooltip = this.getTooltip(element);
        item.command = {
            command: 'curl-code.openRequestBuilder',
            title: 'Open Request',
            arguments: [element.request]
        };

        return item;
    }

    /**
     * Get children of a tree item
     */
    async getChildren(element?: HistoryEntry): Promise<HistoryEntry[]> {
        if (element) {
            return [];
        }
        return this.historyService.getHistory();
    }

    /**
     * Get the label for a history entry
     */
    private getLabel(entry: HistoryEntry): string {
        const { method, url } = entry.request;
        try {
            const urlObj = new URL(url);
            return `${method} ${urlObj.pathname}`;
        } catch {
            return `${method} ${url}`;
        }
    }

    /**
     * Get the description (shown after the label)
     */
    private getDescription(entry: HistoryEntry): string {
        const time = this.formatTime(entry.timestamp);
        if (entry.response) {
            return `${entry.response.status} - ${time}`;
        } else if (entry.error) {
            return `Error - ${time}`;
        }
        return time;
    }

    /**
     * Get the tooltip
     */
    private getTooltip(entry: HistoryEntry): vscode.MarkdownString {
        const { method, url } = entry.request;
        const time = new Date(entry.timestamp).toLocaleString();

        let md = new vscode.MarkdownString();
        md.appendMarkdown(`**${method}** ${url}\n\n`);
        md.appendMarkdown(`*${time}*\n\n`);

        if (entry.response) {
            md.appendMarkdown(`Status: **${entry.response.status}** ${entry.response.statusText}\n`);
            md.appendMarkdown(`Time: ${entry.response.time}ms\n`);
            md.appendMarkdown(`Size: ${this.formatSize(entry.response.size)}`);
        } else if (entry.error) {
            md.appendMarkdown(`Error: ${entry.error}`);
        }

        return md;
    }

    /**
     * Get an icon based on response status
     */
    private getStatusIcon(entry: HistoryEntry): vscode.ThemeIcon {
        if (entry.error) {
            return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        }

        if (!entry.response) {
            return new vscode.ThemeIcon('circle-outline');
        }

        const status = entry.response.status;
        if (status >= 200 && status < 300) {
            return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        } else if (status >= 300 && status < 400) {
            return new vscode.ThemeIcon('arrow-right', new vscode.ThemeColor('charts.blue'));
        } else if (status >= 400 && status < 500) {
            return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
        } else {
            return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        }
    }

    /**
     * Format a timestamp to a relative time string
     */
    private formatTime(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) {
            return 'just now';
        } else if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins}m ago`;
        } else if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }
    }

    /**
     * Format a size in bytes to a human-readable string
     */
    private formatSize(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    }
}
