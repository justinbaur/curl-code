/**
 * Tree data provider for environments
 */

import * as vscode from 'vscode';
import type { Environment, EnvironmentVariable } from '../types/collection';
import type { EnvironmentService } from '../services/EnvironmentService';
import type { CollectionService } from '../services/CollectionService';

// Extended variable with environment ID and index for tree operations
interface VariableTreeItem extends EnvironmentVariable {
    environmentId: string;
    index: number;
}

type TreeItemData =
    | { type: 'global-environment'; environment: Environment }
    | { type: 'collection'; collectionId: string; collectionName: string; environments: Environment[] }
    | { type: 'collection-environment'; environment: Environment; collectionName: string; collectionId: string }
    | { type: 'variable'; variable: VariableTreeItem };

// Re-export so command handlers can read collectionId from the item
export type { TreeItemData as EnvironmentTreeItemData };

export class EnvironmentTreeProvider implements vscode.TreeDataProvider<TreeItemData> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemData | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private environmentService: EnvironmentService,
        private collectionService: CollectionService
    ) {
        // Refresh tree when either service changes
        this.environmentService.onChange(() => this.refresh());
        this.collectionService.onChange(() => this.refresh());
    }

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Get tree item representation
     */
    getTreeItem(element: TreeItemData): vscode.TreeItem {
        if (element.type === 'collection') {
            return this.createCollectionItem(element.collectionId, element.collectionName, element.environments);
        } else if ('environment' in element) {
            const collectionName = element.type === 'collection-environment'
                ? element.collectionName
                : undefined;
            return this.createEnvironmentItem(element.environment, collectionName);
        } else {
            return this.createVariableItem(element.variable);
        }
    }

    /**
     * Get children of a tree item
     */
    async getChildren(element?: TreeItemData): Promise<TreeItemData[]> {
        if (!element) {
            // Root level: return global environments and collection nodes
            const items: TreeItemData[] = [];

            // 1. Global environments
            const globalEnvs = this.environmentService.getEnvironments();
            items.push(...globalEnvs.map(env => ({
                type: 'global-environment' as const,
                environment: env
            })));

            // 2. Collection nodes (all collections, so users can add environments to any)
            const collections = this.collectionService.getCollections();
            for (const collection of collections) {
                items.push({
                    type: 'collection' as const,
                    collectionId: collection.id,
                    collectionName: collection.name,
                    environments: collection.environments ?? []
                });
            }

            return items;
        }

        // Collection expanded: return its environments
        if (element.type === 'collection') {
            return element.environments.map(env => ({
                type: 'collection-environment' as const,
                environment: env,
                collectionName: element.collectionName,
                collectionId: element.collectionId
            }));
        }

        // Environment expanded: return its variables
        if ('environment' in element) {
            const env = element.environment;
            return env.variables
                .filter(v => v.enabled)
                .map((variable, index) => ({
                    type: 'variable' as const,
                    variable: {
                        ...variable,
                        environmentId: env.id,
                        index
                    }
                }));
        }

        return [];
    }

    /**
     * Create a tree item for a collection node
     */
    private createCollectionItem(collectionId: string, collectionName: string, environments: Environment[]): vscode.TreeItem {
        const item = new vscode.TreeItem(
            collectionName,
            environments.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );

        // Distinct contextValue so the "New Environment" menu targets only environment-tree collection nodes
        item.contextValue = 'environmentCollection';
        item.id = `env-collection-${collectionId}`;
        item.iconPath = new vscode.ThemeIcon('folder');
        item.description = environments.length > 0
            ? `${environments.length} env${environments.length !== 1 ? 's' : ''}`
            : 'no environments';
        item.tooltip = `Collection: ${collectionName}\n${environments.length} environment${environments.length !== 1 ? 's' : ''}`;

        return item;
    }

    /**
     * Create a tree item for an environment
     */
    private createEnvironmentItem(env: Environment, collectionName?: string): vscode.TreeItem {
        const hasVariables = env.variables.length > 0;

        // For collection environments, use simple name (collection grouping provides context)
        // For global environments, use the name directly
        const label = env.name;

        const item = new vscode.TreeItem(
            label,
            hasVariables
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );

        // Set the id so commands can identify this environment
        item.id = env.id;

        // Different context values for global vs collection environments
        const contextPrefix = collectionName ? 'collection' : 'global';
        item.contextValue = env.isActive
            ? `${contextPrefix}ActiveEnvironment`
            : `${contextPrefix}Environment`;

        // Different icons for collection vs global
        item.iconPath = new vscode.ThemeIcon(
            env.isActive ? 'check' : (collectionName ? 'circle-outline' : 'globe'),
            env.isActive ? new vscode.ThemeColor('charts.green') : undefined
        );

        const source = collectionName ? `from ${collectionName}` : 'global';
        item.description = env.isActive ? 'Active' : `${env.variables.length} vars`;
        item.tooltip = `${env.name} (${source})\n${env.variables.length} variables`;

        return item;
    }

    /**
     * Create a tree item for an environment variable
     */
    private createVariableItem(variable: VariableTreeItem): vscode.TreeItem {
        const item = new vscode.TreeItem(
            variable.key,
            vscode.TreeItemCollapsibleState.None
        );

        item.contextValue = 'variable';
        item.iconPath = new vscode.ThemeIcon(
            variable.type === 'secret' ? 'key' : 'symbol-variable'
        );
        item.description = variable.type === 'secret' ? '••••••' : variable.value;
        item.tooltip = variable.type === 'secret'
            ? `${variable.key} (secret)`
            : `${variable.key} = ${variable.value}`;

        // Store environment ID, variable key, and index for unique tree item IDs
        item.id = `${variable.environmentId}:${variable.key}:${variable.index}`;

        return item;
    }

}
