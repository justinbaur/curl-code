/**
 * Message types for communication between extension host and webview
 */

import type { HttpRequest, HttpResponse } from './request';
import type { Environment } from './collection';

// Extension -> Webview messages
export type ExtensionToWebviewMessage =
    | { type: 'loadRequest'; request: HttpRequest }
    | { type: 'responseReceived'; response: HttpResponse }
    | { type: 'requestError'; error: string; time?: number }
    | { type: 'requestStarted' }
    | { type: 'requestCancelled' }
    | { type: 'requestSaved' }
    | { type: 'loadEnvironments'; environments: Environment[]; activeId?: string }
    | { type: 'themeChanged'; theme: 'light' | 'dark' | 'high-contrast' }
    | { type: 'updateRequest'; request: Partial<HttpRequest> }
    | { type: 'clipboardContent'; text: string };

// Webview -> Extension messages
export type WebviewToExtensionMessage =
    | { type: 'sendRequest'; request: HttpRequest }
    | { type: 'saveRequest'; request: HttpRequest; saveAs?: boolean }
    | { type: 'cancelRequest' }
    | { type: 'copyAsCurl'; request: HttpRequest }
    | { type: 'selectEnvironment'; environmentId: string | null }
    | { type: 'ready' }
    | { type: 'openExternal'; url: string }
    | { type: 'updateRequest'; request: HttpRequest }
    | { type: 'readClipboard' };

export type Message = ExtensionToWebviewMessage | WebviewToExtensionMessage;
