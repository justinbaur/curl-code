/**
 * Service for managing HTTP request collections
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { fsFacade } from '../utils/fsWrapper';
import type { Collection, Folder } from '../types/collection';
import type { HttpRequest } from '../types/request';
import { createEmptyCollection, createEmptyFolder } from '../types/collection';

export class CollectionService {
    private static readonly SECRET_PREFIX = 'curl-code.collection-secret.';
    private collections: Collection[] = [];
    private storageDir: string;
    private context: vscode.ExtensionContext;
    private onChangeEmitter = new vscode.EventEmitter<void>();
    readonly onChange = this.onChangeEmitter.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.storageDir = path.join(context.globalStorageUri.fsPath, 'collections');
    }

    /**
     * Build a SecretStorage key for a collection secret variable
     */
    private secretKey(collectionId: string, envId: string, varKey: string): string {
        return `${CollectionService.SECRET_PREFIX}${collectionId}.${envId}.${varKey}`;
    }

    /**
     * Return a copy of the collection with secret variable values redacted
     */
    private redactSecrets(collection: Collection): Collection {
        return {
            ...collection,
            environments: collection.environments?.map(env => ({
                ...env,
                variables: env.variables.map(v =>
                    v.type === 'secret' ? { ...v, value: '' } : v
                )
            }))
        };
    }

    /**
     * Persist secret variable values into VS Code SecretStorage
     */
    private async persistSecrets(collection: Collection): Promise<void> {
        if (!collection.environments) return;
        for (const env of collection.environments) {
            for (const variable of env.variables) {
                if (variable.type === 'secret') {
                    await this.context.secrets.store(
                        this.secretKey(collection.id, env.id, variable.key),
                        variable.value
                    );
                }
            }
        }
    }

    /**
     * Restore secret variable values from VS Code SecretStorage into memory
     */
    private async restoreSecrets(collection: Collection): Promise<void> {
        if (!collection.environments) return;
        for (const env of collection.environments) {
            for (const variable of env.variables) {
                if (variable.type === 'secret') {
                    const secret = await this.context.secrets.get(
                        this.secretKey(collection.id, env.id, variable.key)
                    );
                    if (secret !== undefined) {
                        variable.value = secret;
                    }
                }
            }
        }
    }

    /**
     * Delete a secret variable from SecretStorage
     */
    async deleteCollectionSecret(collectionId: string, envId: string, varKey: string): Promise<void> {
        await this.context.secrets.delete(this.secretKey(collectionId, envId, varKey));
    }

    /**
     * Delete all secret variables for a collection from SecretStorage
     */
    private async deleteAllSecrets(collection: Collection): Promise<void> {
        if (!collection.environments) return;
        for (const env of collection.environments) {
            for (const variable of env.variables) {
                if (variable.type === 'secret') {
                    await this.context.secrets.delete(
                        this.secretKey(collection.id, env.id, variable.key)
                    );
                }
            }
        }
    }

    /**
     * Sanitize a collection ID to prevent path traversal.
     * Only allows alphanumeric characters, underscores, and hyphens.
     */
    private sanitizeId(id: string): string {
        return id.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /**
     * Validate a linked-collection source path.
     * Must be absolute, end with .json, and not contain traversal sequences.
     */
    private isValidSourcePath(sourcePath: string): boolean {
        if (!path.isAbsolute(sourcePath)) return false;
        if (!sourcePath.endsWith('.json')) return false;
        // Reject paths with traversal sequences
        const normalized = path.resolve(sourcePath);
        if (normalized !== sourcePath) return false;
        return true;
    }

    /**
     * Initialize the service and load collections
     */
    async initialize(): Promise<void> {
        await this.ensureStorageDir();
        await this.loadCollections();
    }

    /**
     * Get all collections
     */
    getCollections(): Collection[] {
        return this.collections;
    }

    /**
     * Get a collection by ID
     */
    getCollection(id: string): Collection | undefined {
        return this.collections.find(c => c.id === id);
    }

    /**
     * Create a new collection
     */
    async createCollection(name: string, description?: string): Promise<Collection> {
        const collection = createEmptyCollection(name);
        if (description) {
            collection.description = description;
        }
        this.collections.push(collection);
        await this.saveCollection(collection);
        this.onChangeEmitter.fire();
        return collection;
    }

    /**
     * Update a collection
     */
    async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | undefined> {
        const index = this.collections.findIndex(c => c.id === id);
        if (index === -1) return undefined;

        this.collections[index] = {
            ...this.collections[index],
            ...updates,
            updatedAt: Date.now()
        };
        await this.saveCollection(this.collections[index]);
        this.onChangeEmitter.fire();
        return this.collections[index];
    }

    /**
     * Delete a collection
     */
    async deleteCollection(id: string): Promise<boolean> {
        const index = this.collections.findIndex(c => c.id === id);
        if (index === -1) return false;

        const collection = this.collections[index];
        this.collections.splice(index, 1);

        // Clean up any secret values stored in SecretStorage
        await this.deleteAllSecrets(collection);

        // For linked collections only delete the stub, never the source file
        const filePath = path.join(this.storageDir, `${this.sanitizeId(collection.id)}.json`);
        try {
            await fsFacade.unlink(filePath);
        } catch {
            // File might not exist
        }

        this.onChangeEmitter.fire();
        return true;
    }

    /**
     * Add a folder to a collection
     */
    async addFolder(collectionId: string, name: string, parentFolderId?: string): Promise<Folder | undefined> {
        const collection = this.getCollection(collectionId);
        if (!collection) return undefined;

        const folder = createEmptyFolder(name, parentFolderId);

        if (parentFolderId) {
            const parentFolder = this.findFolder(collection, parentFolderId);
            if (parentFolder) {
                parentFolder.folders.push(folder);
            }
        } else {
            collection.folders.push(folder);
        }

        await this.saveCollection(collection);
        this.onChangeEmitter.fire();
        return folder;
    }

    /**
     * Save a request to a collection
     */
    async saveRequest(request: HttpRequest, collectionId?: string, folderId?: string): Promise<void> {
        let collection: Collection | undefined;

        if (collectionId) {
            collection = this.getCollection(collectionId);
        } else {
            // Create a default collection if none exists
            if (this.collections.length === 0) {
                collection = await this.createCollection('Default Collection');
            } else {
                collection = this.collections[0];
            }
        }

        if (!collection) return;

        request.collectionId = collection.id;
        request.folderId = folderId;
        request.updatedAt = Date.now();

        // Find existing request or add new
        if (folderId) {
            const folder = this.findFolder(collection, folderId);
            if (folder) {
                const existingIndex = folder.requests.findIndex(r => r.id === request.id);
                if (existingIndex >= 0) {
                    folder.requests[existingIndex] = request;
                } else {
                    folder.requests.push(request);
                }
            }
        } else {
            const existingIndex = collection.requests.findIndex(r => r.id === request.id);
            if (existingIndex >= 0) {
                collection.requests[existingIndex] = request;
            } else {
                collection.requests.push(request);
            }
        }

        await this.saveCollection(collection);
        this.onChangeEmitter.fire();
    }

    /**
     * Delete a request from a collection
     */
    async deleteRequest(requestId: string, collectionId: string, folderId?: string): Promise<boolean> {
        const collection = this.getCollection(collectionId);
        if (!collection) return false;

        if (folderId) {
            const folder = this.findFolder(collection, folderId);
            if (folder) {
                const index = folder.requests.findIndex(r => r.id === requestId);
                if (index >= 0) {
                    folder.requests.splice(index, 1);
                    await this.saveCollection(collection);
                    this.onChangeEmitter.fire();
                    return true;
                }
            }
        } else {
            const index = collection.requests.findIndex(r => r.id === requestId);
            if (index >= 0) {
                collection.requests.splice(index, 1);
                await this.saveCollection(collection);
                this.onChangeEmitter.fire();
                return true;
            }
        }

        return false;
    }

    /**
     * Export a collection to JSON
     */
    async exportCollection(collectionId: string): Promise<string | undefined> {
        const collection = this.getCollection(collectionId);
        if (!collection) return undefined;
        // Strip internal fields and redact secrets before exporting
        const redacted = this.redactSecrets(collection);
        const { sourcePath: _sourcePath, ...exportable } = redacted;
        return JSON.stringify(exportable, null, 2);
    }

    /**
     * Import a collection from JSON
     */
    async importCollection(json: string, sourcePath?: string): Promise<Collection | undefined> {
        try {
            const parsed = JSON.parse(json) as Collection;

            // Check if collection with same name exists
            const existingCollection = this.collections.find(c => c.name === parsed.name);

            if (existingCollection) {
                const choice = await vscode.window.showWarningMessage(
                    `A collection named "${parsed.name}" already exists. Do you want to replace it?`,
                    'Replace', 'Cancel'
                );

                if (choice !== 'Replace') {
                    return undefined;
                }

                await this.deleteCollection(existingCollection.id);
            }

            let newCollection: Collection;

            if (sourcePath) {
                // Validate the source path to prevent arbitrary file access
                if (!this.isValidSourcePath(sourcePath)) {
                    vscode.window.showErrorMessage('Invalid collection source path');
                    return undefined;
                }
                // Linked collection — preserve original IDs, write a stub pointing to the source file
                newCollection = { ...parsed, sourcePath };
                newCollection.id = this.sanitizeId(newCollection.id);
                if (newCollection.environments && newCollection.environments.length > 0) {
                    newCollection.environments = newCollection.environments.map(env => ({
                        ...env,
                        isActive: false
                    }));
                }
                // Migrate any plaintext secrets from the imported data into SecretStorage
                await this.persistSecrets(newCollection);
                const stub = { id: newCollection.id, sourcePath };
                await this.ensureStorageDir();
                await fsFacade.writeFile(
                    path.join(this.storageDir, `${newCollection.id}.json`),
                    JSON.stringify(stub, null, 2),
                    'utf-8'
                );
            } else {
                // Regular import — copy into global storage with a fresh ID
                newCollection = {
                    ...parsed,
                    id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                if (newCollection.environments && newCollection.environments.length > 0) {
                    newCollection.environments = newCollection.environments.map(env => ({
                        ...env,
                        id: `${newCollection.name}_${env.name}`,
                        isActive: false
                    }));
                }
                await this.saveCollection(newCollection);
            }

            this.collections.push(newCollection);
            this.onChangeEmitter.fire();
            return newCollection;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import collection: ${error}`);
            return undefined;
        }
    }

    /**
     * Find a folder by ID within a collection
     */
    private findFolder(collection: Collection, folderId: string): Folder | undefined {
        const search = (folders: Folder[]): Folder | undefined => {
            for (const folder of folders) {
                if (folder.id === folderId) return folder;
                const found = search(folder.folders);
                if (found) return found;
            }
            return undefined;
        };
        return search(collection.folders);
    }

    /**
     * Ensure storage directory exists
     */
    private async ensureStorageDir(): Promise<void> {
        try {
            await fsFacade.mkdir(this.storageDir, { recursive: true });
        } catch {
            // Directory might already exist
        }
    }

    /**
     * Load all collections from storage
     */
    private async loadCollections(): Promise<void> {
        try {
            const files = await fsFacade.readdir(this.storageDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            this.collections = [];
            for (const file of jsonFiles) {
                try {
                    const content = await fsFacade.readFile(path.join(this.storageDir, file), 'utf-8');
                    const parsed = JSON.parse(content);

                    if (parsed.sourcePath && Object.keys(parsed).length === 2) {
                        // Linked collection stub — validate source path before reading
                        if (!this.isValidSourcePath(parsed.sourcePath)) {
                            vscode.window.showWarningMessage(
                                `Skipping linked collection with invalid source path: ${parsed.sourcePath}`
                            );
                            continue;
                        }
                        try {
                            const sourceContent = await fsFacade.readFile(parsed.sourcePath, 'utf-8');
                            const collection = JSON.parse(sourceContent) as Collection;
                            collection.sourcePath = parsed.sourcePath;
                            await this.restoreSecrets(collection);
                            this.collections.push(collection);
                        } catch {
                            vscode.window.showWarningMessage(
                                `Linked collection source file not found: ${parsed.sourcePath}`
                            );
                        }
                    } else {
                        const collection = parsed as Collection;
                        await this.restoreSecrets(collection);
                        this.collections.push(collection);
                    }
                } catch {
                    // Skip invalid files
                }
            }

            // Sort by name
            this.collections.sort((a, b) => a.name.localeCompare(b.name));
        } catch {
            // Directory might not exist yet
            this.collections = [];
        }
    }

    /**
     * Save a collection to storage
     */
    private async saveCollection(collection: Collection): Promise<void> {
        await this.ensureStorageDir();

        // Persist secret values to SecretStorage and redact them from the JSON
        await this.persistSecrets(collection);
        const redacted = this.redactSecrets(collection);

        if (collection.sourcePath) {
            if (!this.isValidSourcePath(collection.sourcePath)) {
                throw new Error('Refusing to write to invalid source path');
            }
            // Linked collection — write back to the source file, stripping the internal sourcePath field
            const { sourcePath: _sourcePath, ...data } = redacted;
            await fsFacade.writeFile(collection.sourcePath, JSON.stringify(data, null, 2), 'utf-8');
        } else {
            const safeId = this.sanitizeId(redacted.id);
            const filePath = path.join(this.storageDir, `${safeId}.json`);
            await fsFacade.writeFile(filePath, JSON.stringify(redacted, null, 2), 'utf-8');
        }
    }
}
