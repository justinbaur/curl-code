import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock VS Code API for webview
const vscodeApiMock = {
	postMessage: vi.fn(),
	setState: vi.fn(),
	getState: vi.fn()
};

// Make vscode API available globally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).acquireVsCodeApi = () => vscodeApiMock;

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // Deprecated
		removeListener: vi.fn(), // Deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock IntersectionObserver (not available in jsdom)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).IntersectionObserver = class IntersectionObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	takeRecords() {
		return [];
	}
	unobserve() {}
};

// Mock ResizeObserver (not available in jsdom)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ResizeObserver = class ResizeObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	unobserve() {}
};

// Suppress console errors during tests (optional)
// You can remove this if you want to see all console output
const originalError = console.error;
beforeAll(() => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	console.error = (...args: any[]) => {
		// Filter out specific React warnings if needed
		if (
			typeof args[0] === 'string' &&
			args[0].includes('Warning: ReactDOM.render')
		) {
			return;
		}
		originalError.call(console, ...args);
	};
});

afterAll(() => {
	console.error = originalError;
});
