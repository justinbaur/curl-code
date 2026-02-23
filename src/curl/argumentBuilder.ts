/**
 * Builds cURL command arguments from an HTTP request
 */

import type { HttpRequest } from '../types/request';

export interface CurlOptions {
    followRedirects: boolean;
    verifySSL: boolean;
    timeout: number;
}

export class ArgumentBuilder {
    /**
     * Build cURL command line arguments from an HTTP request
     */
    build(request: HttpRequest, options: CurlOptions): string[] {
        const args: string[] = [];

        // Method
        args.push('--request', request.method);

        // URL with query params
        const url = this.buildUrl(request);
        args.push(url);

        // Headers
        for (const header of request.headers.filter(h => h.enabled)) {
            args.push('--header', `${header.key}: ${header.value}`);
        }

        // Authentication
        this.addAuthArgs(args, request);

        // Body
        this.addBodyArgs(args, request);

        // Follow redirects
        if (options.followRedirects) {
            args.push('--location');
        }

        // Skip SSL verification
        if (!options.verifySSL) {
            args.push('--insecure');
        }

        // Timeout (convert ms to seconds)
        args.push('--max-time', String(Math.ceil(options.timeout / 1000)));

        return args;
    }

    /**
     * Build the full URL with query parameters
     */
    private buildUrl(request: HttpRequest): string {
        const enabledParams = request.queryParams.filter(p => p.enabled);
        if (enabledParams.length === 0) {
            return request.url;
        }

        try {
            const url = new URL(request.url);
            for (const param of enabledParams) {
                url.searchParams.append(param.key, param.value);
            }
            return url.toString();
        } catch {
            // If URL parsing fails, manually append query params
            const queryString = enabledParams
                .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                .join('&');
            const separator = request.url.includes('?') ? '&' : '?';
            return `${request.url}${separator}${queryString}`;
        }
    }

    /**
     * Add authentication arguments
     */
    private addAuthArgs(args: string[], request: HttpRequest): void {
        switch (request.auth.type) {
            case 'basic':
                if (request.auth.username && request.auth.password) {
                    args.push('--user', `${request.auth.username}:${request.auth.password}`);
                }
                break;
            case 'bearer':
                if (request.auth.token) {
                    args.push('--header', `Authorization: Bearer ${request.auth.token}`);
                }
                break;
            case 'api-key':
                if (request.auth.apiKeyName && request.auth.apiKeyValue) {
                    if (request.auth.apiKeyLocation === 'header') {
                        args.push('--header', `${request.auth.apiKeyName}: ${request.auth.apiKeyValue}`);
                    }
                    // Query params are handled in buildUrl if needed
                }
                break;
        }
    }

    /**
     * Add request body arguments
     */
    private addBodyArgs(args: string[], request: HttpRequest): void {
        if (request.body.type === 'none') {
            return;
        }

        switch (request.body.type) {
            case 'json':
                // Add Content-Type header if not already present
                if (!request.headers.some(h => h.enabled && h.key.toLowerCase() === 'content-type')) {
                    args.push('--header', 'Content-Type: application/json');
                }
                if (request.body.content) {
                    args.push('--data', request.body.content);
                }
                break;

            case 'form-data':
                if (request.body.formData) {
                    for (const item of request.body.formData.filter(f => f.enabled)) {
                        if (item.type === 'file') {
                            args.push('--form', `${item.key}=@${item.value}`);
                        } else {
                            args.push('--form', `${item.key}=${item.value}`);
                        }
                    }
                }
                break;

            case 'x-www-form-urlencoded':
                if (!request.headers.some(h => h.enabled && h.key.toLowerCase() === 'content-type')) {
                    args.push('--header', 'Content-Type: application/x-www-form-urlencoded');
                }
                if (request.body.content) {
                    args.push('--data', request.body.content);
                }
                break;

            case 'raw':
            case 'binary':
                if (request.body.content) {
                    args.push('--data', request.body.content);
                }
                break;
        }
    }

    /**
     * Build a human-readable cURL command string
     */
    buildCommand(request: HttpRequest, options: CurlOptions): string {
        const args = this.build(request, options);
        const binary = process.platform === 'win32' ? 'curl.exe' : 'curl';
        return `${binary} ${args.map(arg => this.escapeArg(arg)).join(' ')}`;
    }

    /**
     * Escape an argument for shell display
     */
    private escapeArg(arg: string): string {
        if (process.platform === 'win32') {
            // Windows CMD: wrap in double quotes if the argument contains spaces or quotes.
            // Only " needs escaping inside a double-quoted string (with backslash).
            if (/[\s"^&|<>]/.test(arg)) {
                return `"${arg.replace(/"/g, '\\"')}"`;
            }
            return arg;
        }
        // Unix: use single quotes; escape embedded single quotes with '\''
        if (/[\s"'\\$`!]/.test(arg)) {
            return `'${arg.replace(/'/g, "'\\''")}'`;
        }
        return arg;
    }
}
