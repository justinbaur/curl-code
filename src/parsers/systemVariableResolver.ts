/**
 * Resolves REST Client-style system variables in HTTP requests.
 *
 * System variables use the {{$name}} or {{$name args}} syntax:
 *   {{$guid}}              — RFC 4122 v4 UUID
 *   {{$timestamp}}         — UTC Unix timestamp (seconds)
 *   {{$randomInt min max}} — random integer in [min, max)
 *   {{$datetime format}}   — formatted UTC datetime (rfc1123 | iso8601)
 *   {{$localDatetime fmt}} — formatted local datetime (rfc1123 | iso8601)
 *   {{$processEnv NAME}}   — OS environment variable
 *   {{$dotenv NAME}}       — variable from co-located .env file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { HttpRequest } from '../types/request';
import { parseEnvFileContent } from './envFileParser';

/** Matches {{$varType}} or {{$varType args}} */
const SYSTEM_VAR_REGEX = /\{\{\$(dotenv|processEnv|guid|timestamp|randomInt|datetime|localDatetime)(?:\s+(.+?))?\}\}/g;

export class SystemVariableResolver {
    /** Cached .env file contents (lazily loaded) */
    private dotenvCache: Map<string, string> | null = null;

    /**
     * @param httpFileDirPath Directory containing the .http file (for $dotenv resolution).
     *                        If undefined, $dotenv variables will be left unresolved.
     */
    constructor(private httpFileDirPath?: string) {}

    /**
     * Resolve all system variables in an HttpRequest, returning a new object.
     */
    resolveInRequest(request: HttpRequest): HttpRequest {
        const r = (text: string): string => this.resolveText(text);

        return {
            ...request,
            url: r(request.url),
            headers: request.headers.map(h => ({ ...h, key: r(h.key), value: r(h.value) })),
            body: {
                ...request.body,
                content: r(request.body.content),
                formData: request.body.formData?.map(f => ({ ...f, key: r(f.key), value: r(f.value) }))
            },
            queryParams: request.queryParams.map(p => ({ ...p, key: r(p.key), value: r(p.value) })),
            auth: {
                ...request.auth,
                username: request.auth.username ? r(request.auth.username) : undefined,
                password: request.auth.password ? r(request.auth.password) : undefined,
                token: request.auth.token ? r(request.auth.token) : undefined,
                apiKeyValue: request.auth.apiKeyValue ? r(request.auth.apiKeyValue) : undefined
            },
            advanced: request.advanced ? {
                ...request.advanced,
                connectTimeout: r(request.advanced.connectTimeout),
                keepaliveTime: r(request.advanced.keepaliveTime),
                cookie: r(request.advanced.cookie),
                cookieJar: r(request.advanced.cookieJar),
                proxy: r(request.advanced.proxy),
                proxyUser: r(request.advanced.proxyUser),
                noproxy: r(request.advanced.noproxy),
                caCert: r(request.advanced.caCert),
                clientCert: r(request.advanced.clientCert),
                clientKey: r(request.advanced.clientKey),
                maxRedirs: r(request.advanced.maxRedirs),
                retry: r(request.advanced.retry),
                retryDelay: r(request.advanced.retryDelay),
                retryMaxTime: r(request.advanced.retryMaxTime),
                awsSigv4: r(request.advanced.awsSigv4),
                oauth2Bearer: r(request.advanced.oauth2Bearer),
                resolve: r(request.advanced.resolve),
                connectTo: r(request.advanced.connectTo),
                limitRate: r(request.advanced.limitRate),
                maxFilesize: r(request.advanced.maxFilesize),
                userAgent: r(request.advanced.userAgent),
                referer: r(request.advanced.referer),
                rawFlags: r(request.advanced.rawFlags),
            } : undefined,
        };
    }

    /**
     * Resolve all {{$...}} system variables in a string.
     * Unrecognised or un-resolvable variables are left as-is.
     */
    resolveText(text: string): string {
        return text.replace(SYSTEM_VAR_REGEX, (match, varType: string, args: string | undefined) => {
            switch (varType) {
                case 'guid':        return this.resolveGuid();
                case 'timestamp':   return this.resolveTimestamp(args);
                case 'randomInt':   return this.resolveRandomInt(args, match);
                case 'datetime':    return this.resolveDatetime(args, false);
                case 'localDatetime': return this.resolveDatetime(args, true);
                case 'processEnv':  return this.resolveProcessEnv(args, match);
                case 'dotenv':      return this.resolveDotenv(args, match);
                default:            return match;
            }
        });
    }

    private resolveGuid(): string {
        return crypto.randomUUID();
    }

    /**
     * Resolve $timestamp with optional offset: {{$timestamp}}, {{$timestamp -3 h}}
     */
    private resolveTimestamp(args: string | undefined): string {
        let date = new Date();
        if (args) {
            date = this.applyOffset(date, args.trim());
        }
        return String(Math.floor(date.getTime() / 1000));
    }

    private resolveRandomInt(args: string | undefined, original: string): string {
        if (!args) return original;
        const parts = args.trim().split(/\s+/);
        if (parts.length !== 2) return original;
        const min = parseInt(parts[0], 10);
        const max = parseInt(parts[1], 10);
        if (isNaN(min) || isNaN(max) || min >= max) return original;
        return String(crypto.randomInt(min, max));
    }

    /**
     * Resolve $datetime / $localDatetime with optional offset.
     * Formats: {{$datetime iso8601}}, {{$datetime rfc1123 -3 h}}, {{$datetime iso8601 1 d}}
     */
    private resolveDatetime(args: string | undefined, local: boolean): string {
        let date = new Date();
        let fmt = 'iso8601';

        if (args) {
            const parts = args.trim().split(/\s+/);
            // First part is format if it's rfc1123 or iso8601
            if (parts[0] === 'rfc1123' || parts[0] === 'iso8601') {
                fmt = parts[0];
                // Remaining parts are offset: e.g. "1 d" or "-3 h"
                if (parts.length >= 3) {
                    date = this.applyOffset(date, parts.slice(1).join(' '));
                }
            } else if (parts.length >= 2) {
                // No format prefix, treat as offset with default iso8601
                date = this.applyOffset(date, args.trim());
            }
        }

        return this.formatDate(date, fmt, local);
    }

    private formatDate(date: Date, fmt: string, local: boolean): string {
        if (fmt === 'rfc1123') {
            return local ? this.toLocalRfc1123(date) : date.toUTCString();
        }
        // iso8601
        if (local) {
            const offset = -date.getTimezoneOffset();
            const sign = offset >= 0 ? '+' : '-';
            const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
            const hrs = pad(Math.floor(Math.abs(offset) / 60));
            const mins = pad(Math.abs(offset) % 60);
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hrs}:${mins}`;
        }
        return date.toISOString();
    }

    private toLocalRfc1123(date: Date): string {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const pad = (n: number) => String(n).padStart(2, '0');
        const offset = -date.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const hrs = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
        const mins = String(Math.abs(offset) % 60).padStart(2, '0');
        return `${days[date.getDay()]}, ${pad(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${sign}${hrs}${mins}`;
    }

    /**
     * Apply a time offset to a date. Offset format: "N unit" where N is signed
     * integer and unit is y|M|w|d|h|m|s|ms.
     */
    private applyOffset(date: Date, offsetStr: string): Date {
        const match = offsetStr.match(/^(-?\d+)\s+(y|M|w|d|h|m|s|ms)$/);
        if (!match) return date;
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        const result = new Date(date.getTime());
        switch (unit) {
            case 'y':  result.setFullYear(result.getFullYear() + amount); break;
            case 'M':  result.setMonth(result.getMonth() + amount); break;
            case 'w':  result.setDate(result.getDate() + amount * 7); break;
            case 'd':  result.setDate(result.getDate() + amount); break;
            case 'h':  result.setHours(result.getHours() + amount); break;
            case 'm':  result.setMinutes(result.getMinutes() + amount); break;
            case 's':  result.setSeconds(result.getSeconds() + amount); break;
            case 'ms': result.setMilliseconds(result.getMilliseconds() + amount); break;
        }
        return result;
    }

    private resolveProcessEnv(args: string | undefined, original: string): string {
        if (!args) return original;
        const varName = args.trim();
        return process.env[varName] ?? original;
    }

    private resolveDotenv(args: string | undefined, original: string): string {
        if (!args || !this.httpFileDirPath) return original;
        const varName = args.trim();
        const envVars = this.loadDotenv();
        return envVars.get(varName) ?? original;
    }

    private loadDotenv(): Map<string, string> {
        if (this.dotenvCache) return this.dotenvCache;

        this.dotenvCache = new Map();
        if (!this.httpFileDirPath) return this.dotenvCache;

        const envPath = path.join(this.httpFileDirPath, '.env');
        try {
            const content = fs.readFileSync(envPath, 'utf-8');
            for (const { key, value } of parseEnvFileContent(content)) {
                this.dotenvCache.set(key, value);
            }
        } catch {
            // .env file not found or unreadable — leave cache empty
        }

        return this.dotenvCache;
    }
}

/**
 * Matches {{%varName}} or {{%$dotenv NAME}} — the % prefix means
 * "resolve the inner variable, then percent-encode the result".
 */
const URL_ENCODE_REGEX = /\{\{%([\w$][\w\s]*?)\}\}/g;

/**
 * Post-processing pass: resolve {{%...}} by looking up the inner expression
 * as a regular {{...}} variable via the supplied resolver, then
 * percent-encoding the result.
 *
 * @param text    The string potentially containing {{%...}} tokens
 * @param resolve A function that resolves a plain `{{expr}}` string
 */
export function resolveUrlEncodedVar(text: string, resolve: (expr: string) => string): string {
    return text.replace(URL_ENCODE_REGEX, (_match, innerExpr: string) => {
        const asTemplate = `{{${innerExpr.trim()}}}`;
        const resolved = resolve(asTemplate);
        if (resolved !== asTemplate) {
            return encodeURIComponent(resolved);
        }
        return _match; // unresolvable — leave as-is
    });
}

/**
 * Apply URL-encode resolution to all string fields of an HttpRequest.
 */
export function resolveUrlEncodedVarsInRequest(
    request: HttpRequest,
    resolve: (expr: string) => string
): HttpRequest {
    const r = (text: string) => resolveUrlEncodedVar(text, resolve);

    return {
        ...request,
        url: r(request.url),
        headers: request.headers.map(h => ({ ...h, key: r(h.key), value: r(h.value) })),
        body: {
            ...request.body,
            content: r(request.body.content),
            formData: request.body.formData?.map(f => ({ ...f, key: r(f.key), value: r(f.value) }))
        },
        queryParams: request.queryParams.map(p => ({ ...p, key: r(p.key), value: r(p.value) })),
        auth: {
            ...request.auth,
            username: request.auth.username ? r(request.auth.username) : undefined,
            password: request.auth.password ? r(request.auth.password) : undefined,
            token: request.auth.token ? r(request.auth.token) : undefined,
            apiKeyValue: request.auth.apiKeyValue ? r(request.auth.apiKeyValue) : undefined
        },
        advanced: request.advanced ? {
            ...request.advanced,
            connectTimeout: r(request.advanced.connectTimeout),
            keepaliveTime: r(request.advanced.keepaliveTime),
            cookie: r(request.advanced.cookie),
            cookieJar: r(request.advanced.cookieJar),
            proxy: r(request.advanced.proxy),
            proxyUser: r(request.advanced.proxyUser),
            noproxy: r(request.advanced.noproxy),
            caCert: r(request.advanced.caCert),
            clientCert: r(request.advanced.clientCert),
            clientKey: r(request.advanced.clientKey),
            maxRedirs: r(request.advanced.maxRedirs),
            retry: r(request.advanced.retry),
            retryDelay: r(request.advanced.retryDelay),
            retryMaxTime: r(request.advanced.retryMaxTime),
            awsSigv4: r(request.advanced.awsSigv4),
            oauth2Bearer: r(request.advanced.oauth2Bearer),
            resolve: r(request.advanced.resolve),
            connectTo: r(request.advanced.connectTo),
            limitRate: r(request.advanced.limitRate),
            maxFilesize: r(request.advanced.maxFilesize),
            userAgent: r(request.advanced.userAgent),
            referer: r(request.advanced.referer),
            rawFlags: r(request.advanced.rawFlags),
        } : undefined,
    };
}
