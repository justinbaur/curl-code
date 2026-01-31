/**
 * Parser for .http/.rest files
 *
 * Supports the standard .http file format:
 * - Variable definitions: @variable = value
 * - Variable interpolation: {{variable}}
 * - Request separator: ###
 * - Comments: # or //
 * - Request line: METHOD URL [HTTP/version]
 * - Headers: Header-Name: value
 * - Body: blank line followed by body content
 */

import type { HttpRequest, HttpMethod, HttpHeader, HttpBody, QueryParam } from '../types/request';
import { generateId } from '../types/request';

interface ParsedRequest {
    method: HttpMethod;
    url: string;
    headers: HttpHeader[];
    body: string;
    startLine: number;
    endLine: number;
    name?: string;
}

export class HttpFileParser {
    private static readonly REQUEST_SEPARATOR = /^#{3,}/;
    private static readonly VARIABLE_DEFINITION = /^@(\w+)\s*=\s*(.+)$/;
    private static readonly REQUEST_LINE = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+?)(?:\s+HTTP\/[\d.]+)?$/i;
    private static readonly HEADER_LINE = /^([A-Za-z0-9-]+):\s*(.+)$/;
    private static readonly COMMENT_LINE = /^(#(?!##)|\/\/)/;
    private static readonly REQUEST_NAME = /^#{1,2}\s+(.+)$/;

    private variables: Map<string, string> = new Map();

    /**
     * Parse all requests from an HTTP file
     */
    parseAll(content: string): HttpRequest[] {
        const requests: HttpRequest[] = [];
        const lines = content.split('\n');
        const blocks = this.splitIntoBlocks(lines);

        for (const block of blocks) {
            const request = this.parseBlock(block.lines, block.startLine, block.name);
            if (request) {
                requests.push(this.toHttpRequest(request));
            }
        }

        return requests;
    }

    /**
     * Parse the request at a specific line position
     */
    parseAtPosition(content: string, lineNumber: number): HttpRequest | null {
        const lines = content.split('\n');
        const blocks = this.splitIntoBlocks(lines);

        for (const block of blocks) {
            if (lineNumber >= block.startLine && lineNumber <= block.endLine) {
                const parsed = this.parseBlock(block.lines, block.startLine, block.name);
                return parsed ? this.toHttpRequest(parsed) : null;
            }
        }

        return null;
    }

    /**
     * Get all variable definitions from the file
     */
    getVariables(content: string): Map<string, string> {
        this.variables.clear();
        const lines = content.split('\n');

        for (const line of lines) {
            const varMatch = line.match(HttpFileParser.VARIABLE_DEFINITION);
            if (varMatch) {
                this.variables.set(varMatch[1], varMatch[2].trim());
            }
        }

        return new Map(this.variables);
    }

    /**
     * Split the file content into request blocks
     */
    private splitIntoBlocks(lines: string[]): { lines: string[]; startLine: number; endLine: number; name?: string }[] {
        const blocks: { lines: string[]; startLine: number; endLine: number; name?: string }[] = [];
        let currentBlock: string[] = [];
        let startLine = 0;
        let currentName: string | undefined;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Check for variable definitions
            const varMatch = trimmedLine.match(HttpFileParser.VARIABLE_DEFINITION);
            if (varMatch) {
                this.variables.set(varMatch[1], varMatch[2].trim());
                continue;
            }

            // Check for request separator
            if (HttpFileParser.REQUEST_SEPARATOR.test(trimmedLine)) {
                if (currentBlock.length > 0) {
                    blocks.push({
                        lines: currentBlock,
                        startLine,
                        endLine: i - 1,
                        name: currentName
                    });
                }
                currentBlock = [];
                currentName = undefined;
                startLine = i + 1;
                continue;
            }

            // Check for request name (# or ## followed by text, but not ###)
            const nameMatch = trimmedLine.match(HttpFileParser.REQUEST_NAME);
            if (nameMatch && !HttpFileParser.REQUEST_SEPARATOR.test(trimmedLine)) {
                currentName = nameMatch[1].trim();
                continue;
            }

            // Skip empty lines at the start of a block
            if (currentBlock.length === 0 && trimmedLine === '') {
                startLine = i + 1;
                continue;
            }

            // Skip comment lines (but not name comments)
            if (HttpFileParser.COMMENT_LINE.test(trimmedLine)) {
                continue;
            }

            currentBlock.push(line);
        }

        // Add the last block
        if (currentBlock.length > 0) {
            blocks.push({
                lines: currentBlock,
                startLine,
                endLine: lines.length - 1,
                name: currentName
            });
        }

        return blocks;
    }

    /**
     * Parse a single request block
     */
    private parseBlock(lines: string[], startLine: number, name?: string): ParsedRequest | null {
        if (lines.length === 0) return null;

        // Find the request line
        let requestLineIndex = -1;
        let method: HttpMethod = 'GET';
        let url = '';

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].trim().match(HttpFileParser.REQUEST_LINE);
            if (match) {
                requestLineIndex = i;
                method = match[1].toUpperCase() as HttpMethod;
                url = this.resolveVariables(match[2].trim());
                break;
            }
        }

        if (requestLineIndex === -1) return null;

        // Parse headers (lines after request line until blank line or body)
        const headers: HttpHeader[] = [];
        let bodyStartIndex = lines.length;

        for (let i = requestLineIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (trimmedLine === '') {
                bodyStartIndex = i + 1;
                break;
            }

            const headerMatch = trimmedLine.match(HttpFileParser.HEADER_LINE);
            if (headerMatch) {
                headers.push({
                    key: headerMatch[1],
                    value: this.resolveVariables(headerMatch[2]),
                    enabled: true
                });
            }
        }

        // Parse body (everything after blank line)
        const bodyLines = lines.slice(bodyStartIndex);
        const body = this.resolveVariables(bodyLines.join('\n').trim());

        // Generate a name if not provided
        const requestName = name || this.generateRequestName(method, url);

        return {
            method,
            url,
            headers,
            body,
            startLine,
            endLine: startLine + lines.length - 1,
            name: requestName
        };
    }

    /**
     * Resolve variable placeholders in text
     */
    private resolveVariables(text: string): string {
        return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return this.variables.get(varName) || match;
        });
    }

    /**
     * Generate a request name from method and URL
     */
    private generateRequestName(method: string, url: string): string {
        try {
            const urlObj = new URL(url, 'http://localhost');
            const path = urlObj.pathname;
            // Use the last segment of the path as the name
            const segments = path.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1] || 'root';
            return `${method} ${lastSegment}`;
        } catch {
            return `${method} request`;
        }
    }

    /**
     * Convert parsed request to HttpRequest type
     */
    private toHttpRequest(parsed: ParsedRequest): HttpRequest {
        const bodyType = this.detectBodyType(parsed.headers, parsed.body);
        const queryParams = this.extractQueryParams(parsed.url);

        return {
            id: generateId(),
            name: parsed.name || `${parsed.method} request`,
            method: parsed.method,
            url: this.getUrlWithoutQueryParams(parsed.url),
            headers: parsed.headers,
            queryParams,
            body: {
                type: bodyType,
                content: parsed.body
            },
            auth: { type: 'none' },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /**
     * Detect body type from headers and content
     */
    private detectBodyType(headers: HttpHeader[], body: string): HttpBody['type'] {
        if (!body) return 'none';

        const contentType = headers.find(
            h => h.key.toLowerCase() === 'content-type'
        )?.value.toLowerCase();

        if (contentType?.includes('application/json')) return 'json';
        if (contentType?.includes('application/x-www-form-urlencoded')) return 'x-www-form-urlencoded';
        if (contentType?.includes('multipart/form-data')) return 'form-data';

        // Try to detect JSON
        if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
            try {
                JSON.parse(body);
                return 'json';
            } catch {
                // Not valid JSON
            }
        }

        return 'raw';
    }

    /**
     * Extract query parameters from URL
     */
    private extractQueryParams(url: string): QueryParam[] {
        try {
            const urlObj = new URL(url, 'http://localhost');
            const params: QueryParam[] = [];
            urlObj.searchParams.forEach((value, key) => {
                params.push({ key, value, enabled: true });
            });
            return params;
        } catch {
            return [];
        }
    }

    /**
     * Get URL without query parameters
     */
    private getUrlWithoutQueryParams(url: string): string {
        try {
            const urlObj = new URL(url, 'http://localhost');
            // If it was a relative URL, preserve the original format
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return `${urlObj.pathname}`;
            }
            return `${urlObj.origin}${urlObj.pathname}`;
        } catch {
            return url.split('?')[0];
        }
    }
}
