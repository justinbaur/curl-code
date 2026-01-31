/**
 * curl-code VS Code Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { CollectionTreeProvider } from './providers/CollectionTreeProvider';
import { HistoryTreeProvider } from './providers/HistoryTreeProvider';
import { EnvironmentTreeProvider } from './providers/EnvironmentTreeProvider';
import { HttpFileCodeLensProvider } from './providers/HttpFileCodeLensProvider';
import { RequestPanelManager } from './webview';
import { CollectionService } from './services/CollectionService';
import { HistoryService } from './services/HistoryService';
import { EnvironmentService } from './services/EnvironmentService';
import { CurlExecutor } from './curl/executor';

export async function activate(context: vscode.ExtensionContext) {
    console.log('curl-code extension is now active');

    // Initialize services
    const collectionService = new CollectionService(context);
    const historyService = new HistoryService(context);
    const environmentService = new EnvironmentService(context);
    const curlExecutor = new CurlExecutor();

    await collectionService.initialize();
    await historyService.initialize();
    await environmentService.initialize();

    // Check if cURL is available
    const curlAvailable = await curlExecutor.checkCurlAvailable();
    if (!curlAvailable) {
        vscode.window.showWarningMessage(
            'cURL is not available on your system. Please install cURL to use this extension.',
            'Learn More'
        ).then(selection => {
            if (selection === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://curl.se/download.html'));
            }
        });
    }

    // Initialize tree providers
    const collectionsProvider = new CollectionTreeProvider(collectionService);
    const historyProvider = new HistoryTreeProvider(historyService);
    const environmentProvider = new EnvironmentTreeProvider(environmentService);

    // Register tree views
    const collectionsView = vscode.window.createTreeView('curl-code.collections', {
        treeDataProvider: collectionsProvider,
        showCollapseAll: true,
        canSelectMany: false
    });

    const historyView = vscode.window.createTreeView('curl-code.history', {
        treeDataProvider: historyProvider
    });

    const environmentView = vscode.window.createTreeView('curl-code.environments', {
        treeDataProvider: environmentProvider
    });

    // Listen for service changes and refresh tree views
    collectionService.onChange(() => collectionsProvider.refresh());
    historyService.onChange(() => historyProvider.refresh());
    environmentService.onChange(() => environmentProvider.refresh());

    // Initialize webview manager
    const requestPanelManager = new RequestPanelManager(
        context,
        curlExecutor,
        collectionService,
        historyService
    );

    // Register commands
    context.subscriptions.push(
        // Request commands
        vscode.commands.registerCommand('curl-code.newRequest', () => {
            requestPanelManager.openNewRequest();
        }),

        vscode.commands.registerCommand('curl-code.sendRequest', async (item) => {
            if (item?.request) { // TODO: fix this
                await requestPanelManager.sendRequest(item.request);
            }
        }),

        vscode.commands.registerCommand('curl-code.openRequestBuilder', (request) => {
            requestPanelManager.openRequest(request); // TODO: What does this add?
        }),

        vscode.commands.registerCommand('curl-code.copyAsCurl', async (item) => {
            if (item?.request) {
                const curlCommand = curlExecutor.buildCurlCommand(item.request);
                await vscode.env.clipboard.writeText(curlCommand);
                vscode.window.showInformationMessage('cURL command copied to clipboard');
            }
        }),

        // Collection commands
        vscode.commands.registerCommand('curl-code.newCollection', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter collection name',
                placeHolder: 'My Collection'
            });
            if (name) {
                await collectionService.createCollection(name);
            }
        }),

        vscode.commands.registerCommand('curl-code.importCollection', async () => {
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'JSON files': ['json']
                }
            });

            if (uris && uris.length > 0) {
                const content = await vscode.workspace.fs.readFile(uris[0]);
                const json = Buffer.from(content).toString('utf-8');
                const collection = await collectionService.importCollection(json);

                if (collection) {
                    vscode.window.showInformationMessage(`Collection "${collection.name}" imported successfully`);
                } else {
                    vscode.window.showErrorMessage('Failed to import collection. Invalid JSON format.');
                }
            }
        }),

        vscode.commands.registerCommand('curl-code.exportCollection', async (item) => {
            if (!item || !item.id) {
                vscode.window.showErrorMessage('Please select a collection to export');
                return;
            }

            const json = await collectionService.exportCollection(item.id);
            if (!json) {
                vscode.window.showErrorMessage('Failed to export collection');
                return;
            }

            const uri = await vscode.window.showSaveDialog({
                filters: {
                    'JSON files': ['json']
                },
                defaultUri: vscode.Uri.file(`${item.name}.json`)
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));
                vscode.window.showInformationMessage('Collection exported successfully');
            }
        }),

        vscode.commands.registerCommand('curl-code.refreshCollections', () => {
            collectionsProvider.refresh();
        }),

        // Environment commands
        vscode.commands.registerCommand('curl-code.newEnvironment', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter environment name',
                placeHolder: 'My Environment'
            });
            if (name) {
                await environmentService.createEnvironment(name);
            }
        }),

        vscode.commands.registerCommand('curl-code.newEnvironmentVariable', async (item) => {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter variable name',
                placeHolder: 'My variable key'
            });
            const value = await vscode.window.showInputBox({
                prompt: 'Enter variable value',
                placeHolder: 'My variable value'
            });
            // const type = await vscode.window.showInputBox({
            //     prompt: 'Enter variable type',
            //     placeHolder: 'default'
            // });

            // TODO: check item if its a tree item and get parent id for env
            if (name && value){
                await environmentService.addVariable(item.id, name, value);
            }
        }),

        vscode.commands.registerCommand('curl-code.refreshEnvironments', () => {
            environmentProvider.refresh();
        }),

        // History commands
        vscode.commands.registerCommand('curl-code.clearHistory', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to clear all request history?',
                { modal: true },
                'Clear'
            );

            if (confirm === 'Clear') {
                await historyService.clearHistory();
                vscode.window.showInformationMessage('Request history cleared');
            }
        }),

        // HTTP file commands
        vscode.commands.registerCommand('curl-code.runHttpFile', async (uri?: vscode.Uri, lineNumber?: number) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const line = lineNumber ?? editor.selection.active.line;

            await requestPanelManager.runFromHttpFile(document, line);
        }),

        vscode.commands.registerCommand('curl-code.copyFromHttpFile', async (uri?: vscode.Uri, lineNumber?: number) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const line = lineNumber ?? editor.selection.active.line;

            await requestPanelManager.copyFromHttpFile(document, line);
        })
    );

    // Register CodeLens provider for .http files
    const codeLensProvider = new HttpFileCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'http', scheme: 'file' },
            codeLensProvider
        )
    );

    // Clean up
    context.subscriptions.push(
        collectionsView,
        historyView,
        environmentView,
        requestPanelManager,
        {
            dispose: () => {
                collectionService.onChange(() => {});
                historyService.onChange(() => {});
                environmentService.onChange(() => {});
            }
        }
    );
}

export function deactivate() {
    console.log('curl-code extension is now deactivated');
}
