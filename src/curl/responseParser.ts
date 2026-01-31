/**
 * Parses cURL output into structured response data
 */

import type { HttpResponse } from '../types/request';

export class ResponseParser {
    /**
     * Parse cURL stdout output into an HttpResponse object
     */
    parse(stdout: string, totalTime: number, curlCommand: string): HttpResponse {
        // Split output into headers, body, and curl info
        const infoMarker = '---CURL_INFO---';
        const [rawContent, curlInfo] = stdout.split(infoMarker);

        // Parse curl info (status code, time, size)
        const infoLines = curlInfo?.trim().split('\n') || [];
        const statusCode = parseInt(infoLines[0] || '0', 10);
        const curlTime = parseFloat(infoLines[1] || '0') * 1000; // Convert to ms
        const size = parseInt(infoLines[2] || '0', 10);

        // Split headers and body
        const { headers, body, statusText } = this.parseHeadersAndBody(rawContent || '');

        // Detect content type
        const contentType = headers['content-type'] || 'text/plain';

        return {
            status: statusCode,
            statusText,
            headers,
            body,
            contentType,
            size: size || Buffer.byteLength(body, 'utf8'),
            time: curlTime || totalTime,
            curlCommand
        };
    }

    /**
     * Parse the raw output into headers and body
     */
    private parseHeadersAndBody(content: string): {
        headers: Record<string, string>;
        body: string;
        statusText: string;
    } {
        const headers: Record<string, string> = {};
        let statusText = '';

        // Handle multiple redirects - we want the last response
        // Each response block is separated by the status line
        const responses = content.split(/(?=HTTP\/[\d.]+\s+\d+)/);
        const lastResponse = responses[responses.length - 1] || content;

        // Find the blank line separating headers from body
        // Try both \r\n\r\n and \n\n
        let headerEndIndex = lastResponse.indexOf('\r\n\r\n');
        let lineEnding = '\r\n';

        if (headerEndIndex === -1) {
            headerEndIndex = lastResponse.indexOf('\n\n');
            lineEnding = '\n';
        }

        if (headerEndIndex === -1) {
            // No headers found, treat entire content as body
            return { headers, body: lastResponse.trim(), statusText };
        }

        const headerSection = lastResponse.substring(0, headerEndIndex);
        const body = lastResponse.substring(headerEndIndex + (lineEnding === '\r\n' ? 4 : 2));

        const headerLines = headerSection.split(lineEnding);

        for (let i = 0; i < headerLines.length; i++) {
            const line = headerLines[i];

            // First line is status line (HTTP/1.1 200 OK)
            if (line.startsWith('HTTP/')) {
                const match = line.match(/HTTP\/[\d.]+ \d+ (.+)/);
                if (match) {
                    statusText = match[1].trim();
                }
                continue;
            }

            // Parse header: value
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim().toLowerCase();
                const value = line.substring(colonIndex + 1).trim();
                headers[key] = value;
            }
        }

        return { headers, body: body.trim(), statusText };
    }

    /**
     * Format response body based on content type
     */
    formatBody(body: string, contentType: string): string {
        if (contentType.includes('application/json')) {
            try {
                const parsed = JSON.parse(body);
                return JSON.stringify(parsed, null, 2);
            } catch {
                return body;
            }
        }
        return body;
    }

    /**
     * Get a human-readable status text for common status codes
     */
    getStatusText(status: number): string {
        const statusTexts: Record<number, string> = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            301: 'Moved Permanently',
            302: 'Found',
            304: 'Not Modified',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout'
        };
        return statusTexts[status] || '';
    }
}
