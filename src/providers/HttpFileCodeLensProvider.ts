/**
 * Provides CodeLens for .http files to run requests inline
 */

import * as vscode from 'vscode';

export class HttpFileCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    // Regex patterns for HTTP file parsing
    private static readonly REQUEST_LINE = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+?)(?:\s+HTTP\/[\d.]+)?$/i;
    private static readonly REQUEST_SEPARATOR = /^#{3,}/;
    private static readonly COMMENT_LINE = /^(#(?!##)|\/\/)/;

    /**
     * Provide CodeLens for each request in the document
     */
    provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const lines = document.getText().split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines and comments
            if (!line || HttpFileCodeLensProvider.COMMENT_LINE.test(line)) {
                continue;
            }

            // Check if this is a request line
            const match = line.match(HttpFileCodeLensProvider.REQUEST_LINE);
            if (match) {
                const range = new vscode.Range(i, 0, i, line.length);
                const method = match[1].toUpperCase();
                const url = match[2];

                // "Send Request" CodeLens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(play) Send Request',
                    command: 'curl-code.runHttpFile',
                    arguments: [document.uri, i],
                    tooltip: `Send ${method} request to ${url}`
                }));

                // "Copy as cURL" CodeLens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(copy) Copy as cURL',
                    command: 'curl-code.copyFromHttpFile',
                    arguments: [document.uri, i],
                    tooltip: 'Copy request as cURL command'
                }));
            }
        }

        return codeLenses;
    }

    /**
     * Resolve a CodeLens (add command if not already set)
     */
    resolveCodeLens(
        codeLens: vscode.CodeLens,
        _token: vscode.CancellationToken
    ): vscode.CodeLens {
        return codeLens;
    }

    /**
     * Trigger a refresh of CodeLenses
     */
    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }
}
