/**
 * Centralized logging utility for debugging
 */

import * as vscode from 'vscode';

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('curl-code');
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Show the output channel
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Log informational message
     */
    info(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INFO: ${message}`;
        this.outputChannel.appendLine(logMessage);

        if (data !== undefined) {
            this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
        }

        console.log(logMessage, data);
    }

    /**
     * Log warning message
     */
    warn(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] WARN: ${message}`;
        this.outputChannel.appendLine(logMessage);

        if (data !== undefined) {
            this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
        }

        console.warn(logMessage, data);
    }

    /**
     * Log error message
     */
    error(message: string, error?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        this.outputChannel.appendLine(logMessage);

        if (error !== undefined) {
            if (error instanceof Error) {
                this.outputChannel.appendLine(`  Error: ${error.message}`);
                this.outputChannel.appendLine(`  Stack: ${error.stack}`);
            } else {
                this.outputChannel.appendLine(`  Error: ${JSON.stringify(error, null, 2)}`);
            }
        }

        console.error(logMessage, error);

        // Auto-show output channel on errors
        this.show();
    }

    /**
     * Log debug message (only in development)
     */
    debug(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] DEBUG: ${message}`;
        this.outputChannel.appendLine(logMessage);

        if (data !== undefined) {
            this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
        }

        console.debug(logMessage, data);
    }

    /**
     * Clear all logs
     */
    clear(): void {
        this.outputChannel.clear();
    }

    /**
     * Dispose the output channel
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}
