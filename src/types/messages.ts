/**
 * Message types for communication between extension host and webview
 */

import type { HttpRequest, HttpResponse } from './request';
import type { Environment } from './collection';

// Extension -> Webview messages
export type ExtensionToWebviewMessage =
    | { type: 'loadRequest'; request: HttpRequest }
    | { type: 'responseReceived'; response: HttpResponse }
    | { type: 'requestError'; error: string }
    | { type: 'requestStarted' }
    | { type: 'requestCancelled' }
    | { type: 'loadEnvironments'; environments: Environment[]; activeId?: string }
    | { type: 'themeChanged'; theme: 'light' | 'dark' | 'high-contrast' }
    | { type: 'updateRequest'; request: Partial<HttpRequest> };

// Webview -> Extension messages
export type WebviewToExtensionMessage =
    | { type: 'sendRequest'; request: HttpRequest }
    | { type: 'saveRequest'; request: HttpRequest }
    | { type: 'cancelRequest' }
    | { type: 'copyAsCurl'; request: HttpRequest }
    | { type: 'selectEnvironment'; environmentId: string }
    | { type: 'ready' }
    | { type: 'openExternal'; url: string }
    | { type: 'updateRequest'; request: HttpRequest };

export type Message = ExtensionToWebviewMessage | WebviewToExtensionMessage;
