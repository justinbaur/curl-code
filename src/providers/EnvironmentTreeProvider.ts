/**
 * Tree data provider for environments
 */

import * as vscode from 'vscode';
import type { Environment, EnvironmentVariable } from '../types/collection';
import type { EnvironmentService } from '../services/EnvironmentService';

type TreeItemData = Environment | EnvironmentVariable;

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
            // Environment children: variables
            return element.variables.filter(v => v.enabled);
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
    private createVariableItem(variable: EnvironmentVariable): vscode.TreeItem {
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

        return item;
    }

    /**
     * Type guard for Environment
     */
    private isEnvironment(item: TreeItemData): item is Environment {
        return 'variables' in item && 'isActive' in item;
    }
}
