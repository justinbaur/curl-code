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
import { Logger } from './utils/Logger';
import { generateId } from './types/request';

export async function activate(context: vscode.ExtensionContext) {
    const logger = Logger.getInstance();
    logger.info('curl-code extension is now active');

    // Initialize services
    const collectionService = new CollectionService(context);
    const historyService = new HistoryService(context);
    const environmentService = new EnvironmentService(context);

    await collectionService.initialize();
    await historyService.initialize();
    await environmentService.initialize();

    // Initialize CurlExecutor with EnvironmentService and CollectionService for variable interpolation
    const curlExecutor = new CurlExecutor(environmentService, collectionService);

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
    const environmentProvider = new EnvironmentTreeProvider(environmentService, collectionService);

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
            return;
        }

        // Check for active collection environments
        const collections = collectionService.getCollections();
        for (const collection of collections) {
            if (collection.environments) {
                const activeCollectionEnv = collection.environments.find(e => e.isActive);
                if (activeCollectionEnv) {
                    statusBarItem.text = `$(globe) ${activeCollectionEnv.name}`;
                    statusBarItem.show();
                    return;
                }
            }
        }

        statusBarItem.text = '$(globe) No Environment';
        statusBarItem.show();
    };

    updateStatusBar();

    // Listen for service changes and refresh tree views
    collectionService.onChange(() => {
        collectionsProvider.refresh();
        updateStatusBar();
    });
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
            if (item?.request) {
                await requestPanelManager.sendRequest(item.request);
            }
        }),

        vscode.commands.registerCommand('curl-code.openRequestBuilder', (request) => {
            requestPanelManager.openRequest(request);
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
                const collection = await collectionService.importCollection(json, uris[0].fsPath);

                if (collection) {
                    // Refresh environment tree to show new/updated environments
                    environmentProvider.refresh();
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

        vscode.commands.registerCommand('curl-code.deleteCollection', async (item) => {
            if (!item || !item.id || !item.name) {
                vscode.window.showErrorMessage('Please select a collection to delete');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Delete collection "${item.name}"? This will also remove all environments associated with this collection.`,
                { modal: true },
                'Delete'
            );

            if (confirm === 'Delete') {
                const deleted = await collectionService.deleteCollection(item.id);
                if (deleted) {
                    // Refresh environment tree since collection environments are now removed
                    environmentProvider.refresh();
                    vscode.window.showInformationMessage(`Collection "${item.name}" deleted`);
                } else {
                    vscode.window.showErrorMessage('Failed to delete collection');
                }
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
            // Extract environment ID from TreeItemData
            // Item can be an environment or a variable
            const envId = item?.environment?.id || item?.variable?.environmentId;

            if (!envId) {
                vscode.window.showErrorMessage('Please select an environment');
                return;
            }

            const name = await vscode.window.showInputBox({
                prompt: 'Enter variable name',
                placeHolder: 'url'
            });
            if (!name) return;

            const typeChoice = await vscode.window.showQuickPick(
                [
                    { label: 'Default', description: 'Stored in plain text', value: 'default' as const },
                    { label: 'Secret', description: 'Stored securely, never exported', value: 'secret' as const }
                ],
                { placeHolder: 'Select variable type' }
            );
            if (!typeChoice) return;
            const varType = typeChoice.value;

            const value = await vscode.window.showInputBox({
                prompt: varType === 'secret' ? 'Enter secret value' : 'Enter variable value',
                placeHolder: varType === 'secret' ? '(input is hidden)' : 'your-value-here',
                password: varType === 'secret'
            });
            if (!value) return;

            // Check if it's a global environment
            const globalEnv = environmentService.getEnvironment(envId);

            if (globalEnv) {
                // It's a global environment
                await environmentService.addVariable(envId, name, value, varType);
                vscode.window.showInformationMessage(`Variable "${name}" updated`);
            } else {
                // It's a collection environment
                const collections = collectionService.getCollections();
                let found = false;

                for (const collection of collections) {
                    if (collection.environments) {
                        const env = collection.environments.find(e => e.id === envId);
                        if (env) {
                            // Update existing variable or add new one
                            const existing = env.variables.find(v => v.key === name);
                            if (existing) {
                                existing.value = value;
                                existing.type = varType;
                                existing.enabled = true;
                            } else {
                                env.variables.push({
                                    key: name,
                                    value: value,
                                    type: varType,
                                    enabled: true
                                });
                            }

                            // Save the updated collection
                            await collectionService.updateCollection(collection.id, collection);
                            vscode.window.showInformationMessage(`Variable "${name}" updated`);
                            found = true;
                            break;
                        }
                    }
                }

                if (!found) {
                    vscode.window.showErrorMessage('Environment not found');
                }
            }

            // Refresh environment tree
            environmentProvider.refresh();
        }),

        vscode.commands.registerCommand('curl-code.editEnvironmentVariable', async (item) => {
            // Item is a TreeItemData with variable property
            if (!item?.variable?.environmentId || !item?.variable?.key) {
                return;
            }

            const environmentId = item.variable.environmentId;
            const variableKey = item.variable.key;
            const variableType = item.variable.type;
            const variableValue = item.variable.value;

            const newValue = await vscode.window.showInputBox({
                prompt: `Edit value for "${variableKey}"`,
                value: variableType === 'secret' ? '' : variableValue,
                placeHolder: variableType === 'secret' ? 'Enter new secret value' : 'Enter new value',
                password: variableType === 'secret'
            });

            if (newValue !== undefined) {
                // Check if it's a global environment
                const globalEnv = environmentService.getEnvironment(environmentId);

                if (globalEnv) {
                    // It's a global environment
                    await environmentService.updateVariable(environmentId, variableKey, { value: newValue });
                    vscode.window.showInformationMessage(`Variable "${variableKey}" updated`);
                } else {
                    // It's a collection environment
                    const collections = collectionService.getCollections();
                    let found = false;

                    for (const collection of collections) {
                        if (collection.environments) {
                            const env = collection.environments.find(e => e.id === environmentId);
                            if (env) {
                                // Find and update the variable
                                const variable = env.variables.find(v => v.key === variableKey);
                                if (variable) {
                                    variable.value = newValue;

                                    // Save the updated collection
                                    await collectionService.updateCollection(collection.id, collection);
                                    vscode.window.showInformationMessage(`Variable "${variableKey}" updated`);
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!found) {
                        vscode.window.showErrorMessage('Environment or variable not found');
                    }
                }

                // Refresh environment tree
                environmentProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('curl-code.deleteEnvironmentVariable', async (item) => {
            // Item is a TreeItemData with variable property
            if (!item?.variable?.environmentId || !item?.variable?.key) {
                return;
            }

            const environmentId = item.variable.environmentId;
            const variableKey = item.variable.key;

            const confirm = await vscode.window.showWarningMessage(
                `Delete variable "${variableKey}"?`,
                { modal: true },
                'Delete'
            );

            if (confirm === 'Delete') {
                // Check if it's a global environment
                const globalEnv = environmentService.getEnvironment(environmentId);

                if (globalEnv) {
                    // It's a global environment
                    await environmentService.deleteVariable(environmentId, variableKey);
                    vscode.window.showInformationMessage(`Variable "${variableKey}" deleted`);
                } else {
                    // It's a collection environment
                    const collections = collectionService.getCollections();
                    let found = false;

                    for (const collection of collections) {
                        if (collection.environments) {
                            const env = collection.environments.find(e => e.id === environmentId);
                            if (env) {
                                // Find and remove the variable
                                const variableIndex = env.variables.findIndex(v => v.key === variableKey);
                                if (variableIndex !== -1) {
                                    const variable = env.variables[variableIndex];
                                    // Clean up SecretStorage if it's a secret variable
                                    if (variable.type === 'secret') {
                                        await collectionService.deleteCollectionSecret(collection.id, environmentId, variableKey);
                                    }
                                    env.variables.splice(variableIndex, 1);

                                    // Save the updated collection
                                    await collectionService.updateCollection(collection.id, collection);
                                    vscode.window.showInformationMessage(`Variable "${variableKey}" deleted`);
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!found) {
                        vscode.window.showErrorMessage('Environment or variable not found');
                    }
                }

                // Refresh environment tree
                environmentProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('curl-code.newCollectionEnvironment', async (item) => {
            const collectionId: string | undefined = item?.collectionId;
            if (!collectionId) {
                vscode.window.showErrorMessage('Please select a collection');
                return;
            }

            const name = await vscode.window.showInputBox({
                prompt: 'Enter environment name',
                placeHolder: 'Production'
            });
            if (!name) { return; }

            const collection = collectionService.getCollections().find(c => c.id === collectionId);
            if (!collection) {
                vscode.window.showErrorMessage('Collection not found');
                return;
            }

            if (!collection.environments) {
                collection.environments = [];
            }
            collection.environments.push({
                id: generateId(),
                name,
                variables: [],
                isActive: false
            });

            await collectionService.updateCollection(collection.id, collection);
            vscode.window.showInformationMessage(`Environment "${name}" created`);
        }),

        vscode.commands.registerCommand('curl-code.refreshEnvironments', () => {
            environmentProvider.refresh();
        }),

        vscode.commands.registerCommand('curl-code.setActiveEnvironment', async (item) => {
            // When invoked from tree view context menu, item is the TreeItemData object
            // When invoked from webview, item has { id, name } structure
            const envId = item?.environment?.id || item?.id;

            if (envId) {
                let environmentName: string | undefined;

                // Check if it's a global environment
                const globalEnv = environmentService.getEnvironment(envId);

                if (globalEnv) {
                    // It's a global environment
                    environmentName = globalEnv.name;
                    await environmentService.setActiveEnvironment(envId);

                    // Deactivate all collection environments
                    const collections = collectionService.getCollections();
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
                                await collectionService.updateCollection(collection.id, collection);
                            }
                        }
                    }
                } else {
                    // Check if it's a collection environment
                    const collections = collectionService.getCollections();
                    let found = false;

                    for (const collection of collections) {
                        if (collection.environments) {
                            const envIndex = collection.environments.findIndex(e => e.id === envId);
                            if (envIndex !== -1) {
                                // Get the environment name
                                environmentName = collection.environments[envIndex].name;

                                // Deactivate all environments in this collection
                                collection.environments.forEach(e => e.isActive = false);
                                // Activate the selected environment
                                collection.environments[envIndex].isActive = true;
                                // Save the collection
                                await collectionService.updateCollection(collection.id, collection);
                                found = true;
                                break;
                            }
                        }
                    }

                    if (!found) {
                        vscode.window.showErrorMessage('Environment not found');
                        return;
                    }

                    // Deactivate global environments
                    await environmentService.setActiveEnvironment(null);
                }

                // Refresh environment tree
                environmentProvider.refresh();

                if (environmentName) {
                    vscode.window.showInformationMessage(`Environment "${environmentName}" is now active`);
                }
            }
        }),

        vscode.commands.registerCommand('curl-code.deactivateEnvironment', async () => {
            // Deactivate global environments
            await environmentService.setActiveEnvironment(null);

            // Deactivate all collection environments
            const collections = collectionService.getCollections();
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
                        await collectionService.updateCollection(collection.id, collection);
                    }
                }
            }

            // Refresh environment tree
            environmentProvider.refresh();
            vscode.window.showInformationMessage('Environment deactivated');
        }),

        vscode.commands.registerCommand('curl-code.deleteEnvironment', async (item) => {
            const env = item?.environment;
            if (!env?.id || !env?.name) {
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Delete environment "${env.name}"? This will delete all variables in this environment.`,
                { modal: true },
                'Delete'
            );

            if (confirm !== 'Delete') {
                return;
            }

            // Global environment
            if (environmentService.getEnvironment(env.id)) {
                await environmentService.deleteEnvironment(env.id);
                vscode.window.showInformationMessage(`Environment "${env.name}" deleted`);
                return;
            }

            // Collection environment
            const collections = collectionService.getCollections();
            for (const collection of collections) {
                if (!collection.environments) { continue; }
                const idx = collection.environments.findIndex(e => e.id === env.id);
                if (idx !== -1) {
                    collection.environments.splice(idx, 1);
                    await collectionService.updateCollection(collection.id, collection);
                    environmentProvider.refresh();
                    vscode.window.showInformationMessage(`Environment "${env.name}" deleted`);
                    return;
                }
            }

            vscode.window.showErrorMessage('Environment not found');
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
    Logger.getInstance().info('curl-code extension is now deactivated');
}
