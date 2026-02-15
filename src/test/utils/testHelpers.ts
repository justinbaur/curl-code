import * as path from 'path';
import * as fs from 'fs/promises';
import { HttpRequest, HttpResponse, HttpAuth } from '../../types/request';

/**
 * Sleep utility for async operations in tests
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a basic HTTP request for testing
 */
export function createMockRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
	const now = Date.now();
	return {
		id: overrides.id || 'test-request-1',
		name: overrides.name || 'Test Request',
		method: overrides.method || 'GET',
		url: overrides.url || 'https://api.example.com/test',
		headers: overrides.headers || [],
		queryParams: overrides.queryParams || [],
		body: overrides.body || { type: 'none', content: '' },
		auth: overrides.auth || { type: 'none' },
		collectionId: overrides.collectionId,
		folderId: overrides.folderId,
		createdAt: overrides.createdAt || now,
		updatedAt: overrides.updatedAt || now
	};
}

/**
 * Create a mock HTTP response for testing
 */
export function createMockResponse(overrides: Partial<HttpResponse> = {}): HttpResponse {
	return {
		status: overrides.status || 200,
		statusText: overrides.statusText || 'OK',
		headers: overrides.headers || {},
		body: overrides.body || '{"success": true}',
		contentType: overrides.contentType || 'application/json',
		size: overrides.size || 22,
		time: overrides.time || 150,
		curlCommand: overrides.curlCommand || 'curl -X GET https://api.example.com/test'
	};
}

/**
 * Create a mock authentication config for testing
 */
export function createMockAuth(type: 'basic' | 'bearer' | 'api-key' = 'bearer'): HttpAuth {
	switch (type) {
		case 'basic':
			return {
				type: 'basic',
				username: 'testuser',
				password: 'testpass'
			};
		case 'bearer':
			return {
				type: 'bearer',
				token: 'test-token-12345'
			};
		case 'api-key':
			return {
				type: 'api-key',
				apiKeyName: 'X-API-Key',
				apiKeyValue: 'test-api-key-67890',
				apiKeyLocation: 'header'
			};
	}
}

/**
 * Load a fixture file from the fixtures directory
 */
export async function loadFixture(filename: string): Promise<string> {
	// __dirname in compiled code points to out/test/utils
	// We need to go up to the project root, then to src/test/fixtures
	const fixturePath = path.join(__dirname, '../../../src/test/fixtures', filename);
	return await fs.readFile(fixturePath, 'utf-8');
}

/**
 * Load a JSON fixture file
 */
export async function loadJsonFixture<T>(filename: string): Promise<T> {
	const content = await loadFixture(filename);
	return JSON.parse(content);
}

/**
 * Create a temporary directory for test files
 */
export async function createTempDir(prefix: string = 'curl-code-test-'): Promise<string> {
	const tmpDir = path.join(__dirname, '../../..', '.tmp', `${prefix}${Date.now()}`);
	await fs.mkdir(tmpDir, { recursive: true });
	return tmpDir;
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
	try {
		await fs.rm(dirPath, { recursive: true, force: true });
	} catch (err) {
		// Ignore errors during cleanup
		console.warn(`Failed to cleanup temp dir ${dirPath}:`, err);
	}
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(message || 'Value is null or undefined');
	}
}

/**
 * Mock cURL output for response parser testing
 */
export function createMockCurlOutput(options: {
	statusCode?: number;
	statusMessage?: string;
	headers?: Record<string, string>;
	body?: string;
	timing?: string;
}): string {
	const {
		statusCode = 200,
		statusMessage = 'OK',
		headers = { 'content-type': 'application/json' },
		body = '{"test": true}',
		timing = '0.150'
	} = options;

	const headerLines = Object.entries(headers)
		.map(([key, value]) => `${key}: ${value}`)
		.join('\n');

	return `HTTP/1.1 ${statusCode} ${statusMessage}
${headerLines}

${body}
time_total: ${timing}`;
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	options: { timeout?: number; interval?: number } = {}
): Promise<void> {
	const { timeout = 5000, interval = 100 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await sleep(interval);
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: { retries?: number; delay?: number; factor?: number } = {}
): Promise<T> {
	const { retries = 3, delay = 100, factor = 2 } = options;
	let lastError: Error | undefined;
	let currentDelay = delay;

	for (let i = 0; i < retries; i++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err as Error;
			if (i < retries - 1) {
				await sleep(currentDelay);
				currentDelay *= factor;
			}
		}
	}

	throw lastError || new Error('Retry failed');
}
