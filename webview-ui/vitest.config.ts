import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	test: {
		// Use jsdom environment for DOM testing
		environment: 'jsdom',

		// Setup file to run before each test file
		setupFiles: ['./src/test-setup.ts'],

		// Include patterns for test files
		include: ['src/**/*.{test,spec}.{ts,tsx}'],

		// Exclude patterns
		exclude: ['node_modules', 'dist', 'build'],

		// Global test configuration
		globals: true,

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			exclude: [
				'node_modules/',
				'src/test-setup.ts',
				'src/__tests__/',
				'src/__mocks__/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/dist/**',
				'**/build/**'
			],
			// Coverage thresholds
			lines: 85,
			functions: 85,
			branches: 75,
			statements: 85
		},

		// Test timeout (5 seconds)
		testTimeout: 5000,

		// Mock reset options
		mockReset: true,
		clearMocks: true,
		restoreMocks: true
	},

	// Resolve aliases to match your tsconfig paths
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	}
});
