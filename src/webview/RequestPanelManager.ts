/**
 * Manages the webview panel for request building and response viewing
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { HttpRequest, HttpResponse } from '../types/request';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types/messages';
import { createEmptyRequest, normalizeRequest } from '../types/request';
import { CurlExecutor } from '../curl/executor';
import { CollectionService } from '../services/CollectionService';
import { HistoryService } from '../services/HistoryService';
import { EnvironmentService } from '../services/EnvironmentService';
import { HttpFileParser } from '../parsers/httpFileParser';
import { Logger } from '../utils/Logger';

export class RequestPanelManager {
    private panel: vscode.WebviewPanel | undefined;
    private currentRequest: HttpRequest | undefined;
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
        // Listen for environment changes and update webview
        this.environmentService.onChange(() => {
            if (this.panel) {
                this.sendEnvironments();
            }
        });
    }

    /**
     * Open a new request in the webview
     */
    openNewRequest(): void {
        const newRequest = createEmptyRequest();
        this.openRequest(newRequest);
    }

    /**
     * Open an existing request in the webview
     */
    openRequest(request: HttpRequest): void {
        try {
            // Normalize the request to ensure all required fields exist
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

            this.currentRequest = normalizedRequest;

            if (this.panel) {
                this.logger.debug('Reusing existing panel');
                this.panel.reveal(vscode.ViewColumn.One);
                this.sendMessage({ type: 'loadRequest', request: normalizedRequest });
                return;
            }

            this.logger.debug('Creating new panel');
            this.createPanel();
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
     * Send an HTTP request
     */
    async sendRequest(request: HttpRequest): Promise<void> {
        this.sendMessage({ type: 'requestStarted' });

        try {
            const response = await this.curlExecutor.execute(request);
            this.sendMessage({ type: 'responseReceived', response });

            // Save to history
            await this.historyService.addEntry(request, response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendMessage({ type: 'requestError', error: errorMessage });

            // Save failed request to history
            await this.historyService.addEntry(request, undefined, errorMessage);
        }
    }

    /**
     * Dispose of the panel
     */
    dispose(): void {
        this.panel?.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    /**
     * Create the webview panel
     */
    private createPanel(): void {
        try {
            this.logger.info('Creating webview panel');

            this.panel = vscode.window.createWebviewPanel(
                'curl-code.requestBuilder',
                'curl-code',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')
                    ]
                }
            );

            this.logger.debug('Setting webview HTML content');
            this.panel.webview.html = this.getWebviewContent(this.panel.webview);

            this.panel.iconPath = vscode.Uri.joinPath(
                this.context.extensionUri,
                'media',
                'icons',
                'curl-code.png'
            );

            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(
                (message: WebviewToExtensionMessage) => {
                    this.logger.debug('Received message from webview', { type: message.type });
                    this.handleMessage(message);
                },
                undefined,
                this.disposables
            );

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.logger.info('Webview panel disposed');
                this.panel = undefined;
            }, null, this.disposables);

            this.logger.info('Webview panel created successfully');
        } catch (error) {
            this.logger.error('Failed to create webview panel', error);
            vscode.window.showErrorMessage(`Failed to create request panel: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Handle messages from the webview
     */
    private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
        try {
            this.logger.debug(`Handling webview message: ${message.type}`);

            switch (message.type) {
                case 'ready':
                    this.logger.info('Webview ready, sending initial data');
                    // Send current request
                    if (this.currentRequest) {
                        this.logger.debug('Sending current request to webview', {
                            requestId: this.currentRequest.id,
                            requestName: this.currentRequest.name
                        });
                        this.sendMessage({ type: 'loadRequest', request: this.currentRequest });
                    } else {
                        this.logger.warn('No current request to send to webview');
                    }

                    // Send environments
                    this.sendEnvironments();
                    break;

            case 'sendRequest':
                this.currentRequest = message.request;
                await this.sendRequest(message.request);
                break;

            case 'saveRequest':
                this.currentRequest = message.request;
                await this.collectionService.saveRequest(message.request);
                vscode.window.showInformationMessage('Request saved');
                break;

            case 'cancelRequest':
                this.curlExecutor.cancel();
                this.sendMessage({ type: 'requestCancelled' });
                break;

            case 'copyAsCurl':
                const curlCommand = this.curlExecutor.buildCurlCommand(message.request);
                await vscode.env.clipboard.writeText(curlCommand);
                vscode.window.showInformationMessage('cURL command copied to clipboard');
                break;

            case 'openExternal':
                vscode.env.openExternal(vscode.Uri.parse(message.url));
                break;

            case 'updateRequest':
                this.currentRequest = message.request;
                break;

            case 'selectEnvironment':
                if (message.environmentId) {
                    let environmentName: string | undefined;

                    // Check if it's a global environment
                    const globalEnv = this.environmentService.getEnvironment(message.environmentId);

                    if (globalEnv) {
                        // It's a global environment
                        environmentName = globalEnv.name;
                        await this.environmentService.setActiveEnvironment(message.environmentId);
                    } else {
                        // Check if it's a collection environment
                        const collections = this.collectionService.getCollections();
                        let found = false;

                        for (const collection of collections) {
                            if (collection.environments) {
                                const envIndex = collection.environments.findIndex(e => e.id === message.environmentId);
                                if (envIndex !== -1) {
                                    // Get the environment name
                                    environmentName = collection.environments[envIndex].name;

                                    // Deactivate all environments in this collection
                                    collection.environments.forEach(e => e.isActive = false);
                                    // Activate the selected environment
                                    collection.environments[envIndex].isActive = true;
                                    // Save the collection
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

                        // Deactivate global environments
                        await this.environmentService.setActiveEnvironment(null);
                    }

                    this.sendEnvironments();

                    if (environmentName) {
                        vscode.window.showInformationMessage(`Environment "${environmentName}" is now active`);
                    }
                } else {
                    // Deactivate all environments
                    await this.environmentService.setActiveEnvironment(null);

                    // Deactivate all collection environments
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
     * Send environment data to the webview
     */
    private sendEnvironments(): void {
        // Get global environments
        const globalEnvironments = this.environmentService.getEnvironments();

        // Get collection environments
        const collectionEnvironments: any[] = [];
        const collections = this.collectionService.getCollections();
        for (const collection of collections) {
            if (collection.environments && collection.environments.length > 0) {
                // Add collection name to environment for display
                collectionEnvironments.push(...collection.environments.map(env => ({
                    ...env,
                    // Add a display name that includes the collection
                    name: `${collection.name} / ${env.name}`
                })));
            }
        }

        // Combine both types of environments
        const allEnvironments = [...globalEnvironments, ...collectionEnvironments];

        // Find active environment from either global or collection environments
        const activeEnv = this.environmentService.getActiveEnvironment();
        let activeId: string | undefined = undefined;

        if (activeEnv) {
            activeId = activeEnv.id;
        } else {
            // Check if any environment is marked as active (including collection environments)
            const activeCollectionEnv = collectionEnvironments.find(env => env.isActive);
            if (activeCollectionEnv) {
                activeId = activeCollectionEnv.id;
            }
        }

        this.sendMessage({
            type: 'loadEnvironments',
            environments: allEnvironments,
            activeId
        });
    }

    /**
     * Send a message to the webview
     */
    private sendMessage(message: ExtensionToWebviewMessage): void {
        this.panel?.webview.postMessage(message);
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
