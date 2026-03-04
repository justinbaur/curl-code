/**
 * Service for managing .env file-backed environments
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { Environment, EnvironmentVariable } from '../types/collection';
import { generateEnvironmentId } from '../types/collection';
import { parseEnvFileContent } from '../parsers/envFileParser';

/** Serializable record stored in workspaceState */
interface EnvFileRecord {
    id: string;
    name: string;
    filePath: string;
    isActive: boolean;
}

export class EnvFileService implements vscode.Disposable {
    private static readonly STORAGE_KEY = 'curl-code.envFiles';
    private environments: Environment[] = [];
    private records: EnvFileRecord[] = [];
    private fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private onChangeEmitter = new vscode.EventEmitter<void>();
    readonly onChange = this.onChangeEmitter.event;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Initialize: load stored env file records and parse files from disk
     */
    async initialize(): Promise<void> {
        this.records = this.context.workspaceState.get<EnvFileRecord[]>(EnvFileService.STORAGE_KEY) ?? [];
        await this.reloadAllEnvFiles();
    }

    /**
     * Import a .env file as an environment
     */
    async importEnvFile(filePath: string): Promise<Environment> {
        // Check if already imported
        const existing = this.records.find(r => r.filePath === filePath);
        if (existing) {
            // Re-parse and return
            await this.reloadEnvFile(existing.id);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const env = this.environments.find(e => e.id === existing.id)!;
            return env;
        }

        const name = path.basename(filePath);
        const id = generateEnvironmentId();

        const record: EnvFileRecord = { id, name, filePath, isActive: false };
        this.records.push(record);

        const variables = await this.parseFileAtPath(filePath);
        const env: Environment = {
            id,
            name,
            variables,
            isActive: false,
            filePath
        };
        this.environments.push(env);

        this.watchFile(id, filePath);
        await this.save();
        this.onChangeEmitter.fire();
        return env;
    }

    /**
     * Remove a .env file environment
     */
    async removeEnvFile(id: string): Promise<boolean> {
        const recordIndex = this.records.findIndex(r => r.id === id);
        if (recordIndex === -1) return false;

        this.records.splice(recordIndex, 1);

        const envIndex = this.environments.findIndex(e => e.id === id);
        if (envIndex !== -1) {
            this.environments.splice(envIndex, 1);
        }

        // Dispose file watcher
        const watcher = this.fileWatchers.get(id);
        if (watcher) {
            watcher.dispose();
            this.fileWatchers.delete(id);
        }

        await this.save();
        this.onChangeEmitter.fire();
        return true;
    }

    /**
     * Re-read a single .env file from disk
     */
    async reloadEnvFile(id: string): Promise<boolean> {
        const record = this.records.find(r => r.id === id);
        if (!record) return false;

        const variables = await this.parseFileAtPath(record.filePath);
        const env = this.environments.find(e => e.id === id);
        if (env) {
            env.variables = variables;
        }

        this.onChangeEmitter.fire();
        return true;
    }

    /**
     * Re-read all tracked .env files from disk
     */
    async reloadAllEnvFiles(): Promise<void> {
        this.environments = [];

        // Dispose existing watchers
        for (const watcher of this.fileWatchers.values()) {
            watcher.dispose();
        }
        this.fileWatchers.clear();

        for (const record of this.records) {
            const variables = await this.parseFileAtPath(record.filePath);
            this.environments.push({
                id: record.id,
                name: record.name,
                variables,
                isActive: record.isActive,
                filePath: record.filePath
            });
            this.watchFile(record.id, record.filePath);
        }
    }

    /**
     * Get all .env file environments
     */
    getEnvFileEnvironments(): Environment[] {
        return this.environments;
    }

    /**
     * Get an environment by ID
     */
    getEnvironment(id: string): Environment | undefined {
        return this.environments.find(e => e.id === id);
    }

    /**
     * Get the active .env file environment (if any)
     */
    getActiveEnvironment(): Environment | undefined {
        return this.environments.find(e => e.isActive);
    }

    /**
     * Activate or deactivate a .env file environment
     */
    async setActiveEnvironment(id: string | null): Promise<void> {
        for (const env of this.environments) {
            env.isActive = false;
        }
        for (const record of this.records) {
            record.isActive = false;
        }

        if (id) {
            const env = this.environments.find(e => e.id === id);
            if (env) env.isActive = true;
            const record = this.records.find(r => r.id === id);
            if (record) record.isActive = true;
        }

        await this.save();
        this.onChangeEmitter.fire();
    }

    /**
     * Resolve {{variables}} using the active .env file environment
     */
    resolveVariables(text: string): string {
        const activeEnv = this.getActiveEnvironment();
        if (!activeEnv) return text;

        return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            const variable = activeEnv.variables.find(v => v.key === varName && v.enabled);
            return variable ? variable.value : match;
        });
    }

    /**
     * Parse a .env file at the given path into EnvironmentVariable[]
     */
    private async parseFileAtPath(filePath: string): Promise<EnvironmentVariable[]> {
        try {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            const text = Buffer.from(content).toString('utf-8');
            const parsed = parseEnvFileContent(text);

            return parsed.map(v => ({
                key: v.key,
                value: v.value,
                type: 'default' as const,
                enabled: true
            }));
        } catch {
            // File may have been deleted or become unreadable
            return [];
        }
    }

    /**
     * Set up a file watcher for a .env file
     */
    private watchFile(id: string, filePath: string): void {
        const pattern = new vscode.RelativePattern(
            path.dirname(filePath),
            path.basename(filePath)
        );
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        const reload = async () => {
            await this.reloadEnvFile(id);
        };

        watcher.onDidChange(reload);
        watcher.onDidCreate(reload);
        watcher.onDidDelete(reload);

        this.fileWatchers.set(id, watcher);
    }

    /**
     * Persist records to workspaceState
     */
    private async save(): Promise<void> {
        await this.context.workspaceState.update(EnvFileService.STORAGE_KEY, this.records);
    }

    dispose(): void {
        for (const watcher of this.fileWatchers.values()) {
            watcher.dispose();
        }
        this.fileWatchers.clear();
        this.onChangeEmitter.dispose();
    }
}
