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

        // Advanced options
        this.addAdvancedArgs(args, request);

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
     * Add advanced cURL flags from the request's advanced options
     */
    private addAdvancedArgs(args: string[], request: HttpRequest): void {
        const adv = request.advanced;
        if (!adv) return;

        // HTTP Version
        const httpVersionMap: Record<string, string> = {
            'http1.0': '--http1.0',
            'http1.1': '--http1.1',
            'http2': '--http2',
            'http2-prior-knowledge': '--http2-prior-knowledge',
            'http3': '--http3',
            'http3-only': '--http3-only',
        };
        if (adv.httpVersion !== 'default' && httpVersionMap[adv.httpVersion]) {
            args.push(httpVersionMap[adv.httpVersion]);
        }

        // Connection & Timeout
        if (adv.connectTimeout) args.push('--connect-timeout', adv.connectTimeout);
        if (adv.keepaliveTime) args.push('--keepalive-time', adv.keepaliveTime);
        if (adv.noKeepalive) args.push('--no-keepalive');
        if (adv.tcpNodelay) args.push('--tcp-nodelay');

        // Cookies
        if (adv.cookie) args.push('--cookie', adv.cookie);
        if (adv.cookieJar) args.push('--cookie-jar', adv.cookieJar);

        // Proxy
        if (adv.proxy) args.push('--proxy', adv.proxy);
        if (adv.proxyUser) args.push('--proxy-user', adv.proxyUser);
        if (adv.noproxy) args.push('--noproxy', adv.noproxy);

        // SSL/TLS version
        const tlsVersionMap: Record<string, string> = {
            'tlsv1.0': '--tlsv1.0',
            'tlsv1.1': '--tlsv1.1',
            'tlsv1.2': '--tlsv1.2',
            'tlsv1.3': '--tlsv1.3',
        };
        if (adv.tlsVersion !== 'default' && tlsVersionMap[adv.tlsVersion]) {
            args.push(tlsVersionMap[adv.tlsVersion]);
        }
        if (adv.caCert) args.push('--cacert', adv.caCert);
        if (adv.clientCert) args.push('--cert', adv.clientCert);
        if (adv.clientKey) args.push('--key', adv.clientKey);

        // Redirects
        if (adv.maxRedirs) args.push('--max-redirs', adv.maxRedirs);
        if (adv.locationTrusted) args.push('--location-trusted');
        if (adv.post301) args.push('--post301');
        if (adv.post302) args.push('--post302');
        if (adv.post303) args.push('--post303');

        // Retry
        if (adv.retry) args.push('--retry', adv.retry);
        if (adv.retryDelay) args.push('--retry-delay', adv.retryDelay);
        if (adv.retryMaxTime) args.push('--retry-max-time', adv.retryMaxTime);

        // Compression & Output
        if (adv.compressed) args.push('--compressed');
        if (adv.verbose) args.push('--verbose');

        // Auth extensions
        if (adv.digest) args.push('--digest');
        if (adv.ntlm) args.push('--ntlm');
        if (adv.negotiate) args.push('--negotiate');
        if (adv.awsSigv4) args.push('--aws-sigv4', adv.awsSigv4);
        if (adv.oauth2Bearer) args.push('--oauth2-bearer', adv.oauth2Bearer);

        // DNS / Resolution
        if (adv.resolve) args.push('--resolve', adv.resolve);
        if (adv.connectTo) args.push('--connect-to', adv.connectTo);

        // Rate Limiting
        if (adv.limitRate) args.push('--limit-rate', adv.limitRate);
        if (adv.maxFilesize) args.push('--max-filesize', adv.maxFilesize);

        // Other shortcuts
        if (adv.userAgent) args.push('--user-agent', adv.userAgent);
        if (adv.referer) args.push('--referer', adv.referer);

        // Raw flags (appended LAST so they can override structured flags)
        if (adv.rawFlags.trim()) {
            const parsed = this.parseRawFlags(adv.rawFlags);
            args.push(...parsed);
        }
    }

    /**
     * Parse a raw flags string into an array of arguments.
     * Handles quoted strings (single and double quotes) and flags with values.
     */
    private parseRawFlags(raw: string): string[] {
        const args: string[] = [];
        const regex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(raw)) !== null) {
            let arg = match[0];
            // Strip surrounding quotes
            if ((arg.startsWith('"') && arg.endsWith('"')) ||
                (arg.startsWith("'") && arg.endsWith("'"))) {
                arg = arg.slice(1, -1);
            }
            args.push(arg);
        }

        return args;
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
            // Escape backslashes and double quotes inside the quoted string to preserve them.
            if (/[\s"^&|<>]/.test(arg)) {
                return `"${arg.replace(/["\\]/g, match => `\\${match}`)}"`;
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
