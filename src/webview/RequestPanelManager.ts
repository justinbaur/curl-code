/**
 * Manages the webview panel for request building and response viewing
 */

import * as vscode from 'vscode';
import type { HttpRequest } from '../types/request';
import type { Environment, Folder } from '../types/collection';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types/messages';
import { createEmptyRequest, normalizeRequest, generateId } from '../types/request';
import { CurlExecutor } from '../curl/executor';
import { CollectionService } from '../services/CollectionService';
import { HistoryService } from '../services/HistoryService';
import { EnvironmentService } from '../services/EnvironmentService';
import { HttpFileParser } from '../parsers/httpFileParser';
import { Logger } from '../utils/Logger';

export class RequestPanelManager {
    private panels = new Map<string, vscode.WebviewPanel>();
    private disposables: vscode.Disposable[] = [];
    private logger = Logger.getInstance();

    constructor(
        private context: vscode.ExtensionContext,
        private curlExecutor: CurlExecutor,
        private collectionService: CollectionService,
        private historyService: HistoryService,
        private environmentService: EnvironmentService
    ) {
        this.logger.info('RequestPanelManager initialized');
        // Broadcast environment changes to all open panels
        this.environmentService.onChange(() => {
            this.sendEnvironments();
        });
    }

    /**
     * Open a new blank request in a new tab
     */
    openNewRequest(): void {
        this.createPanel(createEmptyRequest());
    }

    /**
     * Open an existing request — reveal its tab if already open, else create a new one
     */
    openRequest(request: HttpRequest): void {
        try {
            const normalizedRequest = normalizeRequest(request);

            this.logger.info('Opening request', {
                id: normalizedRequest.id,
                name: normalizedRequest.name,
                method: normalizedRequest.method,
                url: normalizedRequest.url,
                hasHeaders: normalizedRequest.headers?.length > 0,
                hasQueryParams: normalizedRequest.queryParams?.length > 0,
                hasBody: normalizedRequest.body !== undefined,
                hasAuth: normalizedRequest.auth !== undefined
            });

            const existing = this.panels.get(normalizedRequest.id);
            if (existing) {
                this.logger.debug('Revealing existing tab for request', { id: normalizedRequest.id });
                existing.reveal(vscode.ViewColumn.Active);
                return;
            }

            this.logger.debug('Creating new tab for request', { id: normalizedRequest.id });
            this.createPanel(normalizedRequest);
        } catch (error) {
            this.logger.error('Failed to open request', error);
            vscode.window.showErrorMessage(`Failed to open request: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Run a request from an HTTP file
     */
    async runFromHttpFile(document: vscode.TextDocument, lineNumber: number): Promise<void> {
        const parser = new HttpFileParser();
        const request = parser.parseAtPosition(document.getText(), lineNumber);

        if (request) {
            this.openRequest(request);
            await this.sendRequest(request);
        } else {
            vscode.window.showErrorMessage('No HTTP request found at cursor position');
        }
    }

    /**
     * Copy a request from an HTTP file as cURL
     */
    async copyFromHttpFile(document: vscode.TextDocument, lineNumber: number): Promise<void> {
        const parser = new HttpFileParser();
        const request = parser.parseAtPosition(document.getText(), lineNumber);

        if (request) {
            const curlCommand = this.curlExecutor.buildCurlCommand(request);
            await vscode.env.clipboard.writeText(curlCommand);
            vscode.window.showInformationMessage('cURL command copied to clipboard');
        } else {
            vscode.window.showErrorMessage('No HTTP request found at cursor position');
        }
    }

    /**
     * Execute an HTTP request — finds the panel for this request and routes responses to it
     */
    async sendRequest(request: HttpRequest): Promise<void> {
        const panel = this.panels.get(request.id);
        if (panel) {
            await this.executeSendRequest(request, panel);
        }
    }

    /**
     * Dispose all panels
     */
    dispose(): void {
        this.panels.forEach(p => p.dispose());
        this.panels.clear();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    /**
     * Create a new webview panel for the given request
     */
    private createPanel(request: HttpRequest): void {
        try {
            this.logger.info('Creating webview panel', { id: request.id });

            const panel = vscode.window.createWebviewPanel(
                'curl-code.requestBuilder',
                this.panelTitle(request),
                vscode.ViewColumn.Active,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')
                    ]
                }
            );

            panel.webview.html = this.getWebviewContent(panel.webview);
            panel.iconPath = vscode.Uri.joinPath(
                this.context.extensionUri,
                'media',
                'icons',
                'curl-code.png'
            );

            this.panels.set(request.id, panel);

            // Mutable reference to the request for this panel — updated by 'updateRequest' messages
            let currentRequest = request;

            panel.webview.onDidReceiveMessage(
                (message: WebviewToExtensionMessage) => {
                    this.logger.debug('Received message from webview', { type: message.type });
                    this.handleMessage(message, panel, currentRequest, (r) => { currentRequest = r; });
                },
                undefined,
                this.disposables
            );

            panel.onDidDispose(() => {
                this.logger.info('Webview panel disposed', { id: request.id });
                this.panels.delete(request.id);
            }, null, this.disposables);

            this.logger.info('Webview panel created successfully', { id: request.id });
        } catch (error) {
            this.logger.error('Failed to create webview panel', error);
            vscode.window.showErrorMessage(`Failed to create request panel: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Handle a message from a specific webview panel
     */
    private async handleMessage(
        message: WebviewToExtensionMessage,
        panel: vscode.WebviewPanel,
        currentRequest: HttpRequest,
        setCurrentRequest: (r: HttpRequest) => void
    ): Promise<void> {
        try {
            this.logger.debug(`Handling webview message: ${message.type}`);

            switch (message.type) {
                case 'ready':
                    this.logger.info('Webview ready, sending initial data');
                    this.sendMessageTo(panel, { type: 'loadRequest', request: currentRequest });
                    this.sendEnvironments(panel);
                    break;

                case 'sendRequest':
                    setCurrentRequest(message.request);
                    await this.executeSendRequest(message.request, panel);
                    break;

                case 'saveRequest':
                    setCurrentRequest(message.request);
                    if (!message.saveAs && message.request.collectionId) {
                        // Smart save — update in-place without showing the picker
                        await this.collectionService.saveRequest(
                            message.request,
                            message.request.collectionId,
                            message.request.folderId
                        );
                        vscode.window.showInformationMessage('Request saved');
                        this.sendMessageTo(panel, { type: 'requestSaved' });
                        panel.title = this.panelTitle(message.request);
                    } else {
                        await this.pickCollectionAndSave(message.request, panel);
                    }
                    break;

                case 'cancelRequest':
                    this.curlExecutor.cancel();
                    this.sendMessageTo(panel, { type: 'requestCancelled' });
                    break;

                case 'copyAsCurl': {
                    const curlCommand = this.curlExecutor.buildCurlCommand(message.request);
                    await vscode.env.clipboard.writeText(curlCommand);
                    const hasAuth = message.request.auth?.type !== 'none' && message.request.auth?.type !== undefined;
                    vscode.window.showInformationMessage(
                        hasAuth
                            ? 'cURL command copied to clipboard (contains credentials)'
                            : 'cURL command copied to clipboard'
                    );
                    break;
                }

                case 'openExternal': {
                    const uri = vscode.Uri.parse(message.url);
                    if (uri.scheme === 'http' || uri.scheme === 'https') {
                        vscode.env.openExternal(uri);
                    }
                    break;
                }

                case 'updateRequest':
                    setCurrentRequest(message.request);
                    panel.title = `* ${this.panelTitle(message.request)}`;
                    break;

                case 'selectEnvironment':
                    if (message.environmentId) {
                        let environmentName: string | undefined;

                        const globalEnv = this.environmentService.getEnvironment(message.environmentId);

                        if (globalEnv) {
                            environmentName = globalEnv.name;
                            await this.environmentService.setActiveEnvironment(message.environmentId);
                        } else {
                            const collections = this.collectionService.getCollections();
                            let found = false;

                            for (const collection of collections) {
                                if (collection.environments) {
                                    const envIndex = collection.environments.findIndex(e => e.id === message.environmentId);
                                    if (envIndex !== -1) {
                                        environmentName = collection.environments[envIndex].name;
                                        collection.environments.forEach(e => e.isActive = false);
                                        collection.environments[envIndex].isActive = true;
                                        await this.collectionService.updateCollection(collection.id, collection);
                                        found = true;
                                        break;
                                    }
                                }
                            }

                            if (!found) {
                                vscode.window.showErrorMessage('Environment not found');
                                break;
                            }

                            await this.environmentService.setActiveEnvironment(null);
                        }

                        // Broadcast updated environments to all panels
                        this.sendEnvironments();

                        if (environmentName) {
                            vscode.window.showInformationMessage(`Environment "${environmentName}" is now active`);
                        }
                    } else {
                        await this.environmentService.setActiveEnvironment(null);

                        const collections = this.collectionService.getCollections();
                        for (const collection of collections) {
                            if (collection.environments) {
                                let needsUpdate = false;
                                collection.environments.forEach(e => {
                                    if (e.isActive) {
                                        e.isActive = false;
                                        needsUpdate = true;
                                    }
                                });
                                if (needsUpdate) {
                                    await this.collectionService.updateCollection(collection.id, collection);
                                }
                            }
                        }

                        this.sendEnvironments();
                        vscode.window.showInformationMessage('Environment deactivated');
                    }
                    break;
            }
        } catch (error) {
            this.logger.error(`Error handling webview message: ${message.type}`, error);
            vscode.window.showErrorMessage(`Error processing request: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Execute an HTTP request and route the response to a specific panel
     */
    private async executeSendRequest(request: HttpRequest, panel: vscode.WebviewPanel): Promise<void> {
        this.sendMessageTo(panel, { type: 'requestStarted' });

        try {
            const response = await this.curlExecutor.execute(request);
            this.sendMessageTo(panel, { type: 'responseReceived', response });
            await this.historyService.addEntry(request, response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendMessageTo(panel, { type: 'requestError', error: errorMessage });
            await this.historyService.addEntry(request, undefined, errorMessage);
        }
    }

    /**
     * Show a collection (then folder) quick pick and save the request
     */
    private async pickCollectionAndSave(request: HttpRequest, panel: vscode.WebviewPanel): Promise<void> {
        // Prompt for a new name — pre-filled with the current name
        const newName = await vscode.window.showInputBox({
            prompt: 'Request name',
            value: request.name,
            validateInput: v => v.trim() ? undefined : 'Name cannot be empty'
        });
        if (newName === undefined) { return; } // user cancelled

        // Create a copy with a fresh ID so the original is not overwritten
        request = { ...request, id: generateId(), name: newName.trim(), collectionId: undefined, folderId: undefined };

        let collections = this.collectionService.getCollections();

        if (collections.length === 0) {
            const choice = await vscode.window.showInformationMessage(
                'No collections found. Create a default collection?',
                'Create', 'Cancel'
            );
            if (choice !== 'Create') { return; }
            const newCollection = await this.collectionService.createCollection('Default Collection');
            await this.collectionService.saveRequest(request, newCollection.id);
            vscode.window.showInformationMessage(`Request saved to "${newCollection.name}"`);
            this.sendMessageTo(panel, { type: 'requestSaved' });
            panel.title = this.panelTitle(request);
            return;
        }

        type CollectionItem = vscode.QuickPickItem & { id: string };
        const collectionItems: CollectionItem[] = collections.map(c => ({
            label: `$(folder-library) ${c.name}`,
            description: c.id === request.collectionId ? '(current)' : undefined,
            id: c.id
        }));

        const selectedCollection = await vscode.window.showQuickPick(collectionItems, {
            placeHolder: 'Select a collection',
            title: 'Save Request'
        });
        if (!selectedCollection) { return; }

        const collection = collections.find(c => c.id === selectedCollection.id)!;
        const flatFolders = this.flattenFolders(collection.folders);

        let folderId: string | undefined;
        if (flatFolders.length > 0) {
            type FolderItem = vscode.QuickPickItem & { id: string | null };
            const folderItems: FolderItem[] = [
                { label: '$(root-folder) Collection root', id: null },
                ...flatFolders.map(({ folder, path }) => ({
                    label: `$(folder) ${path}`,
                    description: folder.id === request.folderId ? '(current)' : undefined,
                    id: folder.id
                }))
            ];

            const selectedFolder = await vscode.window.showQuickPick(folderItems, {
                placeHolder: 'Select a folder',
                title: 'Save Request'
            });
            if (!selectedFolder) { return; }
            folderId = selectedFolder.id ?? undefined;
        }

        await this.collectionService.saveRequest(request, selectedCollection.id, folderId);
        vscode.window.showInformationMessage(`Request saved to "${collection.name}"`);
        this.sendMessageTo(panel, { type: 'requestSaved' });
        panel.title = this.panelTitle(request);
    }

    private flattenFolders(folders: Folder[], parentPath = ''): Array<{ folder: Folder; path: string }> {
        const result: Array<{ folder: Folder; path: string }> = [];
        for (const folder of folders) {
            const path = parentPath ? `${parentPath} / ${folder.name}` : folder.name;
            result.push({ folder, path });
            if (folder.folders.length > 0) {
                result.push(...this.flattenFolders(folder.folders, path));
            }
        }
        return result;
    }

    /**
     * Send environment data to a specific panel, or broadcast to all panels if none given
     */
    private sendEnvironments(panel?: vscode.WebviewPanel): void {
        const message = this.buildEnvironmentsMessage();
        const targets = panel ? [panel] : [...this.panels.values()];
        targets.forEach(p => this.sendMessageTo(p, message));
    }

    private buildEnvironmentsMessage(): ExtensionToWebviewMessage {
        const globalEnvironments = this.environmentService.getEnvironments();

        const collectionEnvironments: Array<Environment & { collectionName?: string }> = [];
        const collections = this.collectionService.getCollections();
        for (const collection of collections) {
            if (collection.environments && collection.environments.length > 0) {
                collectionEnvironments.push(...collection.environments.map(env => ({
                    ...env,
                    name: `${collection.name} / ${env.name}`
                })));
            }
        }

        const allEnvironments = [...globalEnvironments, ...collectionEnvironments];

        const activeEnv = this.environmentService.getActiveEnvironment();
        let activeId: string | undefined;
        if (activeEnv) {
            activeId = activeEnv.id;
        } else {
            activeId = collectionEnvironments.find(env => env.isActive)?.id;
        }

        return { type: 'loadEnvironments', environments: allEnvironments, activeId };
    }

    /**
     * Send a message to a specific panel
     */
    private sendMessageTo(panel: vscode.WebviewPanel, message: ExtensionToWebviewMessage): void {
        panel.webview.postMessage(message);
    }

    /**
     * Derive a display title from a request
     */
    private panelTitle(request: HttpRequest): string {
        return request.name ? `${request.method} ${request.name}` : 'New Request';
    }

    /**
     * Generate the webview HTML content
     */
    private getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.css')
        );

        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>curl-code</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Generate a nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
