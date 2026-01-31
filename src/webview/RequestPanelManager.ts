/**
 * Manages the webview panel for request building and response viewing
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { HttpRequest, HttpResponse } from '../types/request';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types/messages';
import { createEmptyRequest } from '../types/request';
import { CurlExecutor } from '../curl/executor';
import { CollectionService } from '../services/CollectionService';
import { HistoryService } from '../services/HistoryService';
import { HttpFileParser } from '../parsers/httpFileParser';

export class RequestPanelManager {
    private panel: vscode.WebviewPanel | undefined;
    private currentRequest: HttpRequest | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private curlExecutor: CurlExecutor,
        private collectionService: CollectionService,
        private historyService: HistoryService
    ) {}

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
        this.currentRequest = request;

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.sendMessage({ type: 'loadRequest', request });
            return;
        }

        this.createPanel();
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

        this.panel.webview.html = this.getWebviewContent(this.panel.webview);
        this.panel.iconPath = vscode.Uri.joinPath(
            this.context.extensionUri,
            'media',
            'icons',
            'curl-code.png'
        );

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            (message: WebviewToExtensionMessage) => this.handleMessage(message),
            undefined,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.disposables);
    }

    /**
     * Handle messages from the webview
     */
    private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
        switch (message.type) {
            case 'ready':
                if (this.currentRequest) {
                    this.sendMessage({ type: 'loadRequest', request: this.currentRequest });
                }
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
        }
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
