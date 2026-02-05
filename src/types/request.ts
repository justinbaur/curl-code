/**
 * HTTP request and response type definitions
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface HttpHeader {
    key: string;
    value: string;
    enabled: boolean;
}

export interface QueryParam {
    key: string;
    value: string;
    enabled: boolean;
}

export interface HttpAuth {
    type: 'none' | 'basic' | 'bearer' | 'api-key';
    username?: string;
    password?: string;
    token?: string;
    apiKeyName?: string;
    apiKeyValue?: string;
    apiKeyLocation?: 'header' | 'query';
}

export interface FormDataItem {
    key: string;
    value: string;
    type: 'text' | 'file';
    enabled: boolean;
}

export interface HttpBody {
    type: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';
    content: string;
    formData?: FormDataItem[];
}

export interface HttpRequest {
    id: string;
    name: string;
    method: HttpMethod;
    url: string;
    headers: HttpHeader[];
    queryParams: QueryParam[];
    body: HttpBody;
    auth: HttpAuth;
    collectionId?: string;
    folderId?: string;
    createdAt: number;
    updatedAt: number;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    contentType: string;
    size: number;
    time: number;
    curlCommand: string;
}

export interface RequestExecution {
    request: HttpRequest;
    response?: HttpResponse;
    error?: string;
    startTime: number;
    endTime?: number;
}

export interface HistoryEntry {
    id: string;
    request: HttpRequest;
    response?: HttpResponse;
    error?: string;
    timestamp: number;
}

/**
 * Create an empty HTTP request with default values
 */
export function createEmptyRequest(): HttpRequest {
    return {
        id: generateId(),
        name: 'New Request',
        method: 'GET',
        url: '',
        headers: [],
        queryParams: [],
        body: { type: 'none', content: '' },
        auth: { type: 'none' },
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

/**
 * Generate a unique ID for requests
 */
export function generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Normalize a request object by filling in any missing required fields with defaults.
 * This ensures requests from collections or other sources have all required fields.
 */
export function normalizeRequest(request: Partial<HttpRequest>): HttpRequest {
    return {
        id: request.id || generateId(),
        name: request.name || 'Untitled Request',
        method: request.method || 'GET',
        url: request.url || '',
        headers: request.headers || [],
        queryParams: request.queryParams || [],
        body: {
            type: request.body?.type || 'none',
            content: request.body?.content || '',
            formData: request.body?.formData || []
        },
        auth: request.auth || { type: 'none' },
        collectionId: request.collectionId,
        folderId: request.folderId,
        createdAt: request.createdAt || Date.now(),
        updatedAt: request.updatedAt || Date.now()
    };
}
