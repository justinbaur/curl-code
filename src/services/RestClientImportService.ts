/**
 * Service for detecting and importing REST Client extension environments
 *
 * The REST Client VS Code extension (humao.rest-client) stores environments
 * in settings.json under `rest-client.environmentVariables`. This service
 * detects those environments and offers to import them as curl-code global
 * environments.
 */

import * as vscode from 'vscode';
import type { EnvironmentService } from './EnvironmentService';

/** Shape of REST Client's environmentVariables setting */
type RestClientEnvironments = Record<string, Record<string, string>>;

const DISMISSED_KEY = 'curl-code.restClientImportDismissed';
const IMPORTED_NAMES_KEY = 'curl-code.restClientImportedEnvNames';

export class RestClientImportService {
    constructor(
        private context: vscode.ExtensionContext,
        private environmentService: EnvironmentService
    ) {}

    /**
     * Read REST Client environments from VS Code settings.
     * Returns undefined if the setting doesn't exist or has no entries.
     */
    detectRestClientEnvironments(): RestClientEnvironments | undefined {
        const config = vscode.workspace.getConfiguration('rest-client');
        const envs = config.get<RestClientEnvironments>('environmentVariables');
        if (!envs || Object.keys(envs).length === 0) {
            return undefined;
        }
        return envs;
    }

    /**
     * Check for REST Client environments on activation and prompt the user.
     * This is fire-and-forget — it should not block extension activation.
     */
    async checkAndPromptOnActivation(): Promise<void> {
        const dismissed = this.context.globalState.get<boolean>(DISMISSED_KEY);
        if (dismissed) {
            return;
        }

        const envs = this.detectRestClientEnvironments();
        if (!envs) {
            return;
        }

        const namedEnvs = Object.keys(envs).filter(k => k !== '$shared');
        if (namedEnvs.length === 0) {
            return;
        }

        // Check if all named envs were already imported
        const imported = this.context.globalState.get<string[]>(IMPORTED_NAMES_KEY) ?? [];
        const newEnvs = namedEnvs.filter(name => !imported.includes(name));
        if (newEnvs.length === 0) {
            return;
        }

        const choice = await vscode.window.showInformationMessage(
            `Detected ${newEnvs.length} REST Client environment(s). Import into curl-code?`,
            'Import',
            'Not Now',
            "Don't Ask Again"
        );

        if (choice === 'Import') {
            await this.importAll();
        } else if (choice === "Don't Ask Again") {
            await this.context.globalState.update(DISMISSED_KEY, true);
        }
    }

    /**
     * Import all REST Client environments that haven't been imported yet.
     * Merges $shared variables into each named environment.
     * Returns the number of newly imported environments.
     */
    async importAll(): Promise<number> {
        const envs = this.detectRestClientEnvironments();
        if (!envs) {
            return 0;
        }

        const shared = envs['$shared'] ?? {};
        const namedEnvs = Object.keys(envs).filter(k => k !== '$shared');
        const imported = this.context.globalState.get<string[]>(IMPORTED_NAMES_KEY) ?? [];

        let count = 0;
        for (const name of namedEnvs) {
            if (imported.includes(name)) {
                continue;
            }

            const env = await this.environmentService.createEnvironment(name);

            // Merge: shared first, then env-specific (env-specific wins on conflict)
            const merged = { ...shared, ...envs[name] };
            for (const [key, value] of Object.entries(merged)) {
                await this.environmentService.addVariable(env.id, key, value, 'default');
            }

            imported.push(name);
            count++;
        }

        await this.context.globalState.update(IMPORTED_NAMES_KEY, imported);

        if (count > 0) {
            vscode.window.showInformationMessage(
                `Imported ${count} environment(s) from REST Client.`
            );
        }

        return count;
    }

    /**
     * Import only the selected REST Client environments by name.
     * Returns the number of newly imported environments.
     */
    async importSelected(names: string[]): Promise<number> {
        const envs = this.detectRestClientEnvironments();
        if (!envs) {
            return 0;
        }

        const shared = envs['$shared'] ?? {};
        const imported = this.context.globalState.get<string[]>(IMPORTED_NAMES_KEY) ?? [];

        let count = 0;
        for (const name of names) {
            if (imported.includes(name) || !envs[name]) {
                continue;
            }

            const env = await this.environmentService.createEnvironment(name);

            const merged = { ...shared, ...envs[name] };
            for (const [key, value] of Object.entries(merged)) {
                await this.environmentService.addVariable(env.id, key, value, 'default');
            }

            imported.push(name);
            count++;
        }

        await this.context.globalState.update(IMPORTED_NAMES_KEY, imported);

        if (count > 0) {
            vscode.window.showInformationMessage(
                `Imported ${count} environment(s) from REST Client.`
            );
        }

        return count;
    }

    /**
     * Reset the dismissal flag so the auto-prompt will fire again.
     */
    async resetDismissal(): Promise<void> {
        await this.context.globalState.update(DISMISSED_KEY, undefined);
    }
}
