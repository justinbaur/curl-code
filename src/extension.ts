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

    await collectionService.initialize();
    await historyService.initialize();
    await environmentService.initialize();

    // Initialize CurlExecutor with EnvironmentService for variable interpolation
    const curlExecutor = new CurlExecutor(environmentService);

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

    // Create status bar item for active environment
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'curl-code.quickSwitchEnvironment';
    statusBarItem.tooltip = 'Click to switch environment';

    // Update status bar when environment changes
    const updateStatusBar = () => {
        const activeEnv = environmentService.getActiveEnvironment();
        if (activeEnv) {
            statusBarItem.text = `$(globe) ${activeEnv.name}`;
            statusBarItem.show();
        } else {
            statusBarItem.text = '$(globe) No Environment';
            statusBarItem.show();
        }
    };

    updateStatusBar();

    // Listen for service changes and refresh tree views
    collectionService.onChange(() => collectionsProvider.refresh());
    historyService.onChange(() => historyProvider.refresh());
    environmentService.onChange(() => {
        environmentProvider.refresh();
        updateStatusBar();
    });

    // Initialize webview manager
    const requestPanelManager = new RequestPanelManager(
        context,
        curlExecutor,
        collectionService,
        historyService,
        environmentService
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
                placeHolder: 'api_key'
            });
            const value = await vscode.window.showInputBox({
                prompt: 'Enter variable value',
                placeHolder: 'your-api-key-here'
            });

            if (name && value){
                await environmentService.addVariable(item.id, name, value);
            }
        }),

        vscode.commands.registerCommand('curl-code.editEnvironmentVariable', async (item) => {
            // Item is a VariableTreeItem with environmentId, key, value, type, enabled
            if (!item?.environmentId || !item?.key) {
                return;
            }

            const environmentId = item.environmentId;
            const variableKey = item.key;

            const newValue = await vscode.window.showInputBox({
                prompt: `Edit value for "${variableKey}"`,
                value: item.type === 'secret' ? '' : item.value,
                placeHolder: item.type === 'secret' ? 'Enter new secret value' : 'Enter new value',
                password: item.type === 'secret'
            });

            if (newValue !== undefined) {
                await environmentService.updateVariable(environmentId, variableKey, { value: newValue });
                vscode.window.showInformationMessage(`Variable "${variableKey}" updated`);
            }
        }),

        vscode.commands.registerCommand('curl-code.deleteEnvironmentVariable', async (item) => {
            // Item is a VariableTreeItem with environmentId, key, value, type, enabled
            if (!item?.environmentId || !item?.key) {
                return;
            }

            const environmentId = item.environmentId;
            const variableKey = item.key;

            const confirm = await vscode.window.showWarningMessage(
                `Delete variable "${variableKey}"?`,
                { modal: true },
                'Delete'
            );

            if (confirm === 'Delete') {
                await environmentService.deleteVariable(environmentId, variableKey);
                vscode.window.showInformationMessage(`Variable "${variableKey}" deleted`);
            }
        }),

        vscode.commands.registerCommand('curl-code.refreshEnvironments', () => {
            environmentProvider.refresh();
        }),

        vscode.commands.registerCommand('curl-code.setActiveEnvironment', async (item) => {
            if (item?.id) {
                await environmentService.setActiveEnvironment(item.id);
                vscode.window.showInformationMessage(`Environment "${item.name}" is now active`);
            }
        }),

        vscode.commands.registerCommand('curl-code.deactivateEnvironment', async () => {
            await environmentService.setActiveEnvironment(null);
            vscode.window.showInformationMessage('Environment deactivated');
        }),

        vscode.commands.registerCommand('curl-code.deleteEnvironment', async (item) => {
            if (!item?.id || !item?.name) {
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Delete environment "${item.name}"? This will delete all variables in this environment.`,
                { modal: true },
                'Delete'
            );

            if (confirm === 'Delete') {
                await environmentService.deleteEnvironment(item.id);
                vscode.window.showInformationMessage(`Environment "${item.name}" deleted`);
            }
        }),

        vscode.commands.registerCommand('curl-code.quickSwitchEnvironment', async () => {
            const environments = environmentService.getEnvironments();
            const activeEnv = environmentService.getActiveEnvironment();

            if (environments.length === 0) {
                const action = await vscode.window.showInformationMessage(
                    'No environments found',
                    'Create Environment'
                );
                if (action === 'Create Environment') {
                    vscode.commands.executeCommand('curl-code.newEnvironment');
                }
                return;
            }

            const items = [
                {
                    label: '$(circle-slash) No Environment',
                    description: activeEnv === undefined ? '(current)' : '',
                    id: null
                },
                ...environments.map(env => ({
                    label: `$(${env.isActive ? 'check' : 'circle-outline'}) ${env.name}`,
                    description: env.isActive ? '(current)' : `${env.variables.length} variables`,
                    id: env.id
                }))
            ];

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an environment'
            });

            if (selected) {
                await environmentService.setActiveEnvironment(selected.id);
                if (selected.id) {
                    const env = environmentService.getEnvironment(selected.id);
                    vscode.window.showInformationMessage(`Environment "${env?.name}" is now active`);
                } else {
                    vscode.window.showInformationMessage('Environment deactivated');
                }
            }
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
        statusBarItem,
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
