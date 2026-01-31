/**
 * Executes HTTP requests using cURL
 */

import { spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';
import type { HttpRequest, HttpResponse } from '../types/request';
import { ArgumentBuilder, type CurlOptions } from './argumentBuilder';
import { ResponseParser } from './responseParser';

export class CurlExecutor {
    private currentProcess: ChildProcess | null = null;
    private argumentBuilder: ArgumentBuilder;
    private responseParser: ResponseParser;

    constructor() {
        this.argumentBuilder = new ArgumentBuilder();
        this.responseParser = new ResponseParser();
    }

    /**
     * Execute an HTTP request using cURL
     */
    async execute(request: HttpRequest): Promise<HttpResponse> {
        const config = vscode.workspace.getConfiguration('curl-code');
        const curlPath = config.get<string>('curlPath', 'curl');
        const options = this.getOptions(config);

        const args = this.argumentBuilder.build(request, options);
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';

            // Use -w to get timing and status info
            const writeOutFormat = '\n---CURL_INFO---\n%{http_code}\n%{time_total}\n%{size_download}';
            const fullArgs = [
                ...args,
                '-w', writeOutFormat,
                '-i',       // Include headers in output
                '-s',       // Silent mode (no progress)
                '-S'        // Show errors
            ];

            this.currentProcess = spawn(curlPath, fullArgs, {
                shell: false,
                windowsHide: true
            });

            this.currentProcess.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            this.currentProcess.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            this.currentProcess.on('close', (code) => {
                this.currentProcess = null;
                const endTime = Date.now();

                if (code === 0) {
                    try {
                        const curlCommand = this.buildCurlCommand(request);
                        const response = this.responseParser.parse(
                            stdout,
                            endTime - startTime,
                            curlCommand
                        );
                        resolve(response);
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error}`));
                    }
                } else {
                    // Handle common cURL error codes
                    const errorMessage = this.getCurlErrorMessage(code, stderr);
                    reject(new Error(errorMessage));
                }
            });

            this.currentProcess.on('error', (error) => {
                this.currentProcess = null;
                reject(new Error(`Failed to execute cURL: ${error.message}`));
            });

            // Handle timeout
            const timeout = options.timeout;
            setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill('SIGTERM');
                    reject(new Error(`Request timed out after ${timeout}ms`));
                }
            }, timeout + 1000); // Add buffer for cURL's own timeout handling
        });
    }

    /**
     * Cancel the current request
     */
    cancel(): void {
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
        }
    }

    /**
     * Check if cURL is available on the system
     */
    async checkCurlAvailable(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('curl-code');
        const curlPath = config.get<string>('curlPath', 'curl');

        return new Promise((resolve) => {
            const process = spawn(curlPath, ['--version'], {
                shell: false,
                windowsHide: true
            });

            process.on('close', (code) => {
                resolve(code === 0);
            });

            process.on('error', () => {
                resolve(false);
            });
        });
    }

    /**
     * Build a human-readable cURL command string
     */
    buildCurlCommand(request: HttpRequest): string {
        const config = vscode.workspace.getConfiguration('curl-code');
        const options = this.getOptions(config);
        return this.argumentBuilder.buildCommand(request, options);
    }

    /**
     * Get cURL options from VS Code configuration
     */
    private getOptions(config: vscode.WorkspaceConfiguration): CurlOptions {
        return {
            followRedirects: config.get<boolean>('followRedirects', true),
            verifySSL: config.get<boolean>('verifySSL', true),
            timeout: config.get<number>('timeout', 30000)
        };
    }

    /**
     * Get a human-readable error message for cURL exit codes
     */
    private getCurlErrorMessage(code: number | null, stderr: string): string {
        const errorMessages: Record<number, string> = {
            1: 'Unsupported protocol',
            2: 'Failed to initialize',
            3: 'URL malformed',
            5: 'Could not resolve proxy',
            6: 'Could not resolve host',
            7: 'Failed to connect to host',
            22: 'HTTP error returned',
            23: 'Write error',
            26: 'Read error',
            27: 'Out of memory',
            28: 'Operation timed out',
            33: 'Range error',
            34: 'HTTP post error',
            35: 'SSL connect error',
            47: 'Too many redirects',
            51: 'SSL peer certificate error',
            52: 'No response from server',
            55: 'Network send failed',
            56: 'Network receive failed',
            58: 'SSL local certificate error',
            60: 'SSL certificate problem',
            77: 'SSL CA cert error',
            78: 'Remote file not found'
        };

        if (code !== null && errorMessages[code]) {
            return `cURL error (${code}): ${errorMessages[code]}${stderr ? ` - ${stderr.trim()}` : ''}`;
        }

        return stderr.trim() || `cURL exited with code ${code}`;
    }
}
