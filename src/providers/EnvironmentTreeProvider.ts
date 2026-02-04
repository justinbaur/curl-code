/**
 * Tree data provider for environments
 */

import * as vscode from 'vscode';
import type { Environment, EnvironmentVariable } from '../types/collection';
import type { EnvironmentService } from '../services/EnvironmentService';

// Extended variable with environment ID for tree operations
interface VariableTreeItem extends EnvironmentVariable {
    environmentId: string;
}

type TreeItemData = Environment | VariableTreeItem;

export class EnvironmentTreeProvider implements vscode.TreeDataProvider<TreeItemData> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemData | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private environmentService: EnvironmentService) {}

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
        if (this.isEnvironment(element)) {
            return this.createEnvironmentItem(element);
        } else {
            return this.createVariableItem(element);
        }
    }

    /**
     * Get children of a tree item
     */
    async getChildren(element?: TreeItemData): Promise<TreeItemData[]> {
        if (!element) {
            // Root level - return environments
            return this.environmentService.getEnvironments();
        }

        if (this.isEnvironment(element)) {
            // Environment children: variables (with environment ID attached)
            return element.variables.filter(v => v.enabled).map(v => ({
                ...v,
                environmentId: element.id
            }));
        }

        return [];
    }

    /**
     * Create a tree item for an environment
     */
    private createEnvironmentItem(env: Environment): vscode.TreeItem {
        const hasVariables = env.variables.length > 0;
        const item = new vscode.TreeItem(
            env.name,
            hasVariables
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );

        item.contextValue = env.isActive ? 'activeEnvironment' : 'environment';
        item.iconPath = new vscode.ThemeIcon(
            env.isActive ? 'check' : 'circle-outline',
            env.isActive ? new vscode.ThemeColor('charts.green') : undefined
        );
        item.description = env.isActive ? 'Active' : `${env.variables.length} variables`;
        item.tooltip = `${env.variables.length} variables`;

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

        // Store environment ID and variable key for command handlers
        item.id = `${variable.environmentId}:${variable.key}`;

        return item;
    }

    /**
     * Type guard for Environment
     */
    private isEnvironment(item: TreeItemData): item is Environment {
        return 'variables' in item && 'isActive' in item;
    }

    /**
     * Type guard for VariableTreeItem
     */
    private isVariable(item: TreeItemData): item is VariableTreeItem {
        return 'environmentId' in item && 'key' in item && 'value' in item;
    }
}
