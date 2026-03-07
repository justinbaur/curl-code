/**
 * Manages the webview panel for collection runner
 */

import * as vscode from 'vscode';
import type { HttpRequest } from '../types/request';
import type { RunnerExtensionToWebviewMessage, RunnerWebviewToExtensionMessage, RunnerRequestInfo } from '../types/runnerMessages';
import type { Folder } from '../types/collection';
import { RunnerService } from '../services/RunnerService';
import { CurlExecutor } from '../curl/executor';
import { CollectionService } from '../services/CollectionService';
import { HistoryService } from '../services/HistoryService';
import { EnvironmentService } from '../services/EnvironmentService';
import { EnvFileService } from '../services/EnvFileService';
import { RequestPanelManager } from './RequestPanelManager';

export class RunnerPanelManager implements vscode.Disposable {
    private panel: vscode.WebviewPanel | null = null;
    private runnerService: RunnerService;
    private disposables: vscode.Disposable[] = [];
    private pendingRequests: HttpRequest[] = [];
    private pendingCollectionId = '';
    private pendingCollectionName = '';
    private pendingFolderName?: string;
    private lastRunConfig?: import('../types/runner').RunConfig;

    constructor(
        private context: vscode.ExtensionContext,
        curlExecutor: CurlExecutor,
        private collectionService: CollectionService,
        private historyService: HistoryService,
        private environmentService: EnvironmentService,
        private envFileService: EnvFileService,
        private requestPanelManager: RequestPanelManager
    ) {
        this.runnerService = new RunnerService(curlExecutor, historyService);
    }

    /**
     * Run all requests in a collection or folder
     */
    async runCollection(collectionId: string, folderId?: string): Promise<void> {
        if (this.runnerService.isRunning()) {
            vscode.window.showWarningMessage('A collection run is already in progress. Cancel it first.');
            if (this.panel) {
                this.panel.reveal(vscode.ViewColumn.Active);
            }
            return;
        }

        const collection = this.collectionService.getCollection(collectionId);
        if (!collection) {
            vscode.window.showErrorMessage('Collection not found');
            return;
        }

        const requests = this.runnerService.collectRequests(collection, folderId);
        if (requests.length === 0) {
            vscode.window.showInformationMessage('No requests found in this collection/folder');
            return;
        }

        this.pendingRequests = requests;
        this.pendingCollectionId = collectionId;
        this.pendingCollectionName = collection.name;

        if (folderId) {
            const result = this.collectionService.findCollectionForFolder(folderId);
            this.pendingFolderName = result?.folder.name;
        } else {
            this.pendingFolderName = undefined;
        }

        this.createOrRevealPanel(collection.name, this.pendingFolderName);
    }

    dispose(): void {
        if (this.runnerService.isRunning()) {
            this.runnerService.cancel();
        }
        this.panel?.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    private createOrRevealPanel(collectionName: string, folderName?: string): void {
        const title = folderName
            ? `Run: ${collectionName} / ${folderName}`
            : `Run: ${collectionName}`;

        if (this.panel) {
            this.panel.title = title;
            this.panel.reveal(vscode.ViewColumn.Active);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'curl-code.collectionRunner',
            title,
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent(this.panel.webview);
        this.panel.iconPath = vscode.Uri.joinPath(
            this.context.extensionUri,
            'media',
            'icons',
            'curl-code.png'
        );

        this.panel.webview.onDidReceiveMessage(
            (message: RunnerWebviewToExtensionMessage) => {
                this.handleMessage(message);
            },
            undefined,
            this.disposables
        );

        this.panel.onDidDispose(() => {
            this.panel = null;
            if (this.runnerService.isRunning()) {
                this.runnerService.cancel();
            }
        }, null, this.disposables);
    }

    private async handleMessage(message: RunnerWebviewToExtensionMessage): Promise<void> {
        switch (message.type) {
            case 'runnerReady':
                this.sendLoadRequests();
                break;

            case 'runnerStart':
                this.lastRunConfig = message.config;
                await this.runnerService.startRun(
                    message.config,
                    this.pendingRequests,
                    (msg) => this.sendMessage(msg)
                );
                break;

            case 'runnerCancel':
                this.runnerService.cancel();
                break;

            case 'runnerViewRequest': {
                const request = this.pendingRequests.find(r => r.id === message.requestId);
                if (request) {
                    this.requestPanelManager.openRequest(request);
                }
                break;
            }

            case 'runnerRerun':
                if (this.lastRunConfig) {
                    await this.runnerService.startRun(
                        this.lastRunConfig,
                        this.pendingRequests,
                        (msg) => this.sendMessage(msg)
                    );
                }
                break;

            case 'runnerNewConfig':
                this.sendLoadRequests();
                break;
        }
    }

    private sendLoadRequests(): void {
        const requestInfos: RunnerRequestInfo[] = this.pendingRequests.map(r => ({
            id: r.id,
            name: r.name,
            method: r.method,
            url: r.url,
            folderId: r.folderId,
        }));

        const activeEnvName = this.getActiveEnvironmentName();

        this.sendMessage({
            type: 'runnerLoadRequests',
            requests: requestInfos,
            activeEnvironmentName: activeEnvName,
            collectionName: this.pendingCollectionName,
            folderName: this.pendingFolderName,
        });
    }

    private getActiveEnvironmentName(): string | undefined {
        const activeGlobal = this.environmentService.getActiveEnvironment();
        if (activeGlobal) return activeGlobal.name;

        const activeEnvFile = this.envFileService.getActiveEnvironment();
        if (activeEnvFile) return activeEnvFile.name;

        const collections = this.collectionService.getCollections();
        for (const collection of collections) {
            if (collection.environments) {
                const active = collection.environments.find(e => e.isActive);
                if (active) return `${collection.name} / ${active.name}`;
            }
        }

        return undefined;
    }

    private sendMessage(message: RunnerExtensionToWebviewMessage): void {
        this.panel?.webview.postMessage(message);
    }

    private getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'runner.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'runner.css')
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>Collection Runner</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
