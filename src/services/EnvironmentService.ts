/**
 * Service for managing environments and variables
 */

import * as vscode from 'vscode';
import type { Environment, EnvironmentVariable } from '../types/collection';
import { createEmptyEnvironment } from '../types/collection';

export class EnvironmentService {
    private static readonly ENVIRONMENTS_KEY = 'curl-code.environments';
    private static readonly ACTIVE_ENV_KEY = 'curl-code.activeEnvironment';
    private static readonly SECRET_PREFIX = 'curl-code.secret.';
    private environments: Environment[] = [];
    private activeEnvironmentId: string | null = null;
    private onChangeEmitter = new vscode.EventEmitter<void>();
    readonly onChange = this.onChangeEmitter.event;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Build a SecretStorage key for a secret variable
     */
    private secretKey(envId: string, varKey: string): string {
        return `${EnvironmentService.SECRET_PREFIX}${envId}.${varKey}`;
    }

    /**
     * Initialize the service and load environments
     */
    async initialize(): Promise<void> {
        await this.loadEnvironments();
    }

    /**
     * Get all environments
     */
    getEnvironments(): Environment[] {
        return this.environments;
    }

    /**
     * Get the active environment
     */
    getActiveEnvironment(): Environment | undefined {
        return this.environments.find(e => e.isActive);
    }

    /**
     * Get an environment by ID
     */
    getEnvironment(id: string): Environment | undefined {
        return this.environments.find(e => e.id === id);
    }

    /**
     * Create a new environment
     */
    async createEnvironment(name: string): Promise<Environment> {
        const env = createEmptyEnvironment(name);
        this.environments.push(env);
        await this.saveEnvironments();
        this.onChangeEmitter.fire();
        return env;
    }

    /**
     * Update an environment
     */
    async updateEnvironment(id: string, updates: Partial<Environment>): Promise<Environment | undefined> {
        const index = this.environments.findIndex(e => e.id === id);
        if (index === -1) return undefined;

        this.environments[index] = {
            ...this.environments[index],
            ...updates
        };
        await this.saveEnvironments();
        this.onChangeEmitter.fire();
        return this.environments[index];
    }

    /**
     * Delete an environment
     */
    async deleteEnvironment(id: string): Promise<boolean> {
        const index = this.environments.findIndex(e => e.id === id);
        if (index === -1) return false;

        this.environments.splice(index, 1);
        if (this.activeEnvironmentId === id) {
            this.activeEnvironmentId = null;
        }
        await this.saveEnvironments();
        this.onChangeEmitter.fire();
        return true;
    }

    /**
     * Set the active environment
     */
    async setActiveEnvironment(id: string | null): Promise<void> {
        // Deactivate all environments
        for (const env of this.environments) {
            env.isActive = false;
        }

        // Activate the selected one
        if (id) {
            const env = this.environments.find(e => e.id === id);
            if (env) {
                env.isActive = true;
                this.activeEnvironmentId = id;
            }
        } else {
            this.activeEnvironmentId = null;
        }

        await this.saveEnvironments();
        this.onChangeEmitter.fire();
    }

    /**
     * Add a variable to an environment
     */
    async addVariable(environmentId: string, key: string, value: string, type: 'default' | 'secret' = 'default'): Promise<EnvironmentVariable | undefined> {
        const env = this.getEnvironment(environmentId);
        if (!env) return undefined;

        const variable: EnvironmentVariable = {
            key,
            value,
            type,
            enabled: true
        };

        env.variables.push(variable);
        await this.saveEnvironments();
        this.onChangeEmitter.fire();
        return variable;
    }

    /**
     * Update a variable in an environment
     */
    async updateVariable(environmentId: string, key: string, updates: Partial<EnvironmentVariable>): Promise<boolean> {
        const env = this.getEnvironment(environmentId);
        if (!env) return false;

        const variable = env.variables.find(v => v.key === key);
        if (!variable) return false;

        Object.assign(variable, updates);
        await this.saveEnvironments();
        this.onChangeEmitter.fire();
        return true;
    }

    /**
     * Delete a variable from an environment
     */
    async deleteVariable(environmentId: string, key: string): Promise<boolean> {
        const env = this.getEnvironment(environmentId);
        if (!env) return false;

        const index = env.variables.findIndex(v => v.key === key);
        if (index === -1) return false;

        const variable = env.variables[index];
        if (variable.type === 'secret') {
            await this.context.secrets.delete(this.secretKey(environmentId, key));
        }
        env.variables.splice(index, 1);
        await this.saveEnvironments();
        this.onChangeEmitter.fire();
        return true;
    }

    /**
     * Resolve variables in a string using the active environment
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
     * Get all variable values from the active environment
     */
    getActiveVariables(): Map<string, string> {
        const variables = new Map<string, string>();
        const activeEnv = this.getActiveEnvironment();

        if (activeEnv) {
            for (const variable of activeEnv.variables) {
                if (variable.enabled) {
                    variables.set(variable.key, variable.value);
                }
            }
        }

        return variables;
    }

    /**
     * Load environments from storage, restoring secret values from SecretStorage.
     */
    private async loadEnvironments(): Promise<void> {
        const stored = this.context.globalState.get<Environment[]>(EnvironmentService.ENVIRONMENTS_KEY);
        this.environments = stored || [];
        this.activeEnvironmentId = this.context.globalState.get<string | null>(EnvironmentService.ACTIVE_ENV_KEY) || null;

        // Restore secret variable values from SecretStorage into memory
        for (const env of this.environments) {
            for (const variable of env.variables) {
                if (variable.type === 'secret') {
                    const secret = await this.context.secrets.get(this.secretKey(env.id, variable.key));
                    if (secret !== undefined) {
                        variable.value = secret;
                    }
                }
            }
        }
    }

    /**
     * Save environments to storage.
     * Secret variable values are stored in SecretStorage; globalState keeps a redacted copy.
     */
    private async saveEnvironments(): Promise<void> {
        // Move secret values into SecretStorage and redact them for globalState
        const redacted: Environment[] = this.environments.map(env => ({
            ...env,
            variables: env.variables.map(v => {
                if (v.type === 'secret') {
                    return { ...v, value: '' };
                }
                return v;
            })
        }));

        // Persist secret values in encrypted storage
        for (const env of this.environments) {
            for (const variable of env.variables) {
                if (variable.type === 'secret') {
                    await this.context.secrets.store(
                        this.secretKey(env.id, variable.key),
                        variable.value
                    );
                }
            }
        }

        await this.context.globalState.update(EnvironmentService.ENVIRONMENTS_KEY, redacted);
        await this.context.globalState.update(EnvironmentService.ACTIVE_ENV_KEY, this.activeEnvironmentId);
    }
}
