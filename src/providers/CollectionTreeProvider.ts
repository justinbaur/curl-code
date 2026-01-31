/**
 * Tree data provider for HTTP request collections
 */

import * as vscode from 'vscode';
import type { Collection, Folder } from '../types/collection';
import type { HttpRequest } from '../types/request';
import type { CollectionService } from '../services/CollectionService';

type TreeItemData = Collection | Folder | HttpRequest;

export class CollectionTreeProvider implements vscode.TreeDataProvider<TreeItemData> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemData | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private collectionService: CollectionService) {}

    /**
     * Refresh the tree view
     */
    refresh(item?: TreeItemData): void {
        this._onDidChangeTreeData.fire(item);
    }

    /**
     * Get tree item representation
     */
    getTreeItem(element: TreeItemData): vscode.TreeItem {
        if (this.isCollection(element)) {
            return this.createCollectionItem(element);
        } else if (this.isFolder(element)) {
            return this.createFolderItem(element);
        } else {
            return this.createRequestItem(element);
        }
    }

    /**
     * Get children of a tree item
     */
    async getChildren(element?: TreeItemData): Promise<TreeItemData[]> {
        if (!element) {
            // Root level - return collections
            return this.collectionService.getCollections();
        }

        if (this.isCollection(element)) {
            // Collection children: folders + requests
            return [...element.folders, ...element.requests];
        }

        if (this.isFolder(element)) {
            // Folder children: nested folders + requests
            return [...element.folders, ...element.requests];
        }

        return [];
    }

    /**
     * Get parent of a tree item
     */
    getParent(element: TreeItemData): vscode.ProviderResult<TreeItemData> {
        // For simplicity, we don't track parent relationships
        return null;
    }

    /**
     * Create a tree item for a collection
     */
    private createCollectionItem(collection: Collection): vscode.TreeItem {
        const hasChildren = collection.folders.length > 0 || collection.requests.length > 0;
        const item = new vscode.TreeItem(
            collection.name,
            hasChildren
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'collection';
        item.iconPath = new vscode.ThemeIcon('folder-library');
        item.tooltip = collection.description || `${collection.requests.length} requests`;
        return item;
    }

    /**
     * Create a tree item for a folder
     */
    private createFolderItem(folder: Folder): vscode.TreeItem {
        const hasChildren = folder.folders.length > 0 || folder.requests.length > 0;
        const item = new vscode.TreeItem(
            folder.name,
            hasChildren
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'folder';
        item.iconPath = new vscode.ThemeIcon('folder');
        item.tooltip = folder.description || folder.name;
        return item;
    }

    /**
     * Create a tree item for a request
     */
    private createRequestItem(request: HttpRequest): vscode.TreeItem {
        const item = new vscode.TreeItem(
            request.name,
            vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'request';
        item.iconPath = this.getMethodIcon(request.method);
        item.tooltip = new vscode.MarkdownString(`**${request.method}** ${request.url}`);
        item.description = request.method;
        item.command = {
            command: 'curl-code.openRequestBuilder',
            title: 'Open Request',
            arguments: [request]
        };
        return item;
    }

    /**
     * Get an icon for the HTTP method with appropriate color
     */
    private getMethodIcon(method: string): vscode.ThemeIcon {
        // Use different icons/colors for different methods
        const methodIcons: Record<string, { icon: string; color: string }> = {
            'GET': { icon: 'circle-filled', color: 'charts.green' },
            'POST': { icon: 'circle-filled', color: 'charts.yellow' },
            'PUT': { icon: 'circle-filled', color: 'charts.blue' },
            'PATCH': { icon: 'circle-filled', color: 'charts.purple' },
            'DELETE': { icon: 'circle-filled', color: 'charts.red' },
            'HEAD': { icon: 'circle-outline', color: 'charts.green' },
            'OPTIONS': { icon: 'circle-outline', color: 'charts.gray' }
        };

        const config = methodIcons[method] || { icon: 'circle-outline', color: 'charts.gray' };
        return new vscode.ThemeIcon(config.icon, new vscode.ThemeColor(config.color));
    }

    /**
     * Type guard for Collection
     */
    private isCollection(item: TreeItemData): item is Collection {
        return 'variables' in item && 'folders' in item;
    }

    /**
     * Type guard for Folder
     */
    private isFolder(item: TreeItemData): item is Folder {
        return 'folders' in item && !('variables' in item) && !('method' in item);
    }
}
