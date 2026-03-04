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

export type HttpVersion = 'default' | 'http1.0' | 'http1.1' | 'http2' | 'http2-prior-knowledge' | 'http3' | 'http3-only';
export type TlsVersion = 'default' | 'tlsv1.0' | 'tlsv1.1' | 'tlsv1.2' | 'tlsv1.3';

export interface AdvancedOptions {
    // HTTP Version
    httpVersion: HttpVersion;

    // Connection & Timeout
    connectTimeout: string;
    keepaliveTime: string;
    noKeepalive: boolean;
    tcpNodelay: boolean;

    // Cookies
    cookie: string;
    cookieJar: string;

    // Proxy
    proxy: string;
    proxyUser: string;
    noproxy: string;

    // SSL/TLS
    tlsVersion: TlsVersion;
    caCert: string;
    clientCert: string;
    clientKey: string;

    // Redirects
    maxRedirs: string;
    locationTrusted: boolean;
    post301: boolean;
    post302: boolean;
    post303: boolean;

    // Retry
    retry: string;
    retryDelay: string;
    retryMaxTime: string;

    // Compression & Output
    compressed: boolean;
    verbose: boolean;

    // Auth extensions
    digest: boolean;
    ntlm: boolean;
    negotiate: boolean;
    awsSigv4: string;
    oauth2Bearer: string;

    // DNS / Resolution
    resolve: string;
    connectTo: string;

    // Rate Limiting
    limitRate: string;
    maxFilesize: string;

    // Other shortcuts
    userAgent: string;
    referer: string;

    // Raw flags textarea
    rawFlags: string;
}

export function createDefaultAdvancedOptions(): AdvancedOptions {
    return {
        httpVersion: 'default',
        connectTimeout: '',
        keepaliveTime: '',
        noKeepalive: false,
        tcpNodelay: false,
        cookie: '',
        cookieJar: '',
        proxy: '',
        proxyUser: '',
        noproxy: '',
        tlsVersion: 'default',
        caCert: '',
        clientCert: '',
        clientKey: '',
        maxRedirs: '',
        locationTrusted: false,
        post301: false,
        post302: false,
        post303: false,
        retry: '',
        retryDelay: '',
        retryMaxTime: '',
        compressed: false,
        verbose: false,
        digest: false,
        ntlm: false,
        negotiate: false,
        awsSigv4: '',
        oauth2Bearer: '',
        resolve: '',
        connectTo: '',
        limitRate: '',
        maxFilesize: '',
        userAgent: '',
        referer: '',
        rawFlags: '',
    };
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
    advanced?: AdvancedOptions;
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
    debugLog?: string;
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
        advanced: createDefaultAdvancedOptions(),
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
        advanced: request.advanced
            ? { ...createDefaultAdvancedOptions(), ...request.advanced }
            : createDefaultAdvancedOptions(),
        collectionId: request.collectionId,
        folderId: request.folderId,
        createdAt: request.createdAt || Date.now(),
        updatedAt: request.updatedAt || Date.now()
    };
}
