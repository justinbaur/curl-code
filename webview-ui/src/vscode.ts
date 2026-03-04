/**
 * VS Code API wrapper for webview communication
 */

// Type definitions for messages
export interface HttpMethod {
  type: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
}

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

export interface HttpBody {
  type: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';
  content: string;
  formData?: Array<{
    key: string;
    value: string;
    type: 'text' | 'file';
    enabled: boolean;
  }>;
}

export type HttpVersion = 'default' | 'http1.0' | 'http1.1' | 'http2' | 'http2-prior-knowledge' | 'http3' | 'http3-only';
export type TlsVersion = 'default' | 'tlsv1.0' | 'tlsv1.1' | 'tlsv1.2' | 'tlsv1.3';

export interface AdvancedOptions {
  httpVersion: HttpVersion;
  connectTimeout: string;
  keepaliveTime: string;
  noKeepalive: boolean;
  tcpNodelay: boolean;
  cookie: string;
  cookieJar: string;
  proxy: string;
  proxyUser: string;
  noproxy: string;
  tlsVersion: TlsVersion;
  caCert: string;
  clientCert: string;
  clientKey: string;
  maxRedirs: string;
  locationTrusted: boolean;
  post301: boolean;
  post302: boolean;
  post303: boolean;
  retry: string;
  retryDelay: string;
  retryMaxTime: string;
  compressed: boolean;
  verbose: boolean;
  digest: boolean;
  ntlm: boolean;
  negotiate: boolean;
  awsSigv4: string;
  oauth2Bearer: string;
  resolve: string;
  connectTo: string;
  limitRate: string;
  maxFilesize: string;
  userAgent: string;
  referer: string;
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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
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

export interface EnvironmentVariable {
  key: string;
  value: string;
  type: 'default' | 'secret';
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  isActive: boolean;
}

// Message types
export type ExtensionMessage =
  | { type: 'loadRequest'; request: HttpRequest }
  | { type: 'responseReceived'; response: HttpResponse }
  | { type: 'requestError'; error: string }
  | { type: 'requestStarted' }
  | { type: 'requestCancelled' }
  | { type: 'requestSaved' }
  | { type: 'loadEnvironments'; environments: Environment[]; activeId?: string };

export type WebviewMessage =
  | { type: 'sendRequest'; request: HttpRequest }
  | { type: 'saveRequest'; request: HttpRequest; saveAs?: boolean }
  | { type: 'cancelRequest' }
  | { type: 'copyAsCurl'; request: HttpRequest }
  | { type: 'selectEnvironment'; environmentId: string | null }
  | { type: 'ready' }
  | { type: 'openExternal'; url: string };

// VS Code API interface
interface VSCodeApi {
  postMessage(message: WebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeApi;

class VSCodeAPIWrapper {
  private readonly vsCodeApi: VSCodeApi | undefined;

  constructor() {
    if (typeof acquireVsCodeApi === 'function') {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * Post a message to the extension host
   */
  public postMessage(message: WebviewMessage): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log('VS Code API not available, message:', message);
    }
  }

  /**
   * Listen for messages from the extension host
   */
  public onMessage(callback: (message: ExtensionMessage) => void): () => void {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      callback(event.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }

  /**
   * Get persisted state
   */
  public getState<T>(): T | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState() as T;
    }
    return undefined;
  }

  /**
   * Set persisted state
   */
  public setState<T>(state: T): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.setState(state);
    }
  }

  /**
   * Check if running in VS Code
   */
  public isVSCode(): boolean {
    return this.vsCodeApi !== undefined;
  }
}

export const vscode = new VSCodeAPIWrapper();
