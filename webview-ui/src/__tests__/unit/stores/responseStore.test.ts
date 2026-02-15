import { describe, it, expect, beforeEach } from 'vitest';
import { useResponseStore } from '../../../state/responseStore';
import type { HttpResponse } from '../../../vscode';

describe('responseStore', () => {
	beforeEach(() => {
		// Reset store before each test
		useResponseStore.getState().clearResponse();
	});

	describe('initial state', () => {
		it('should initialize with null response and error', () => {
			const { response, error } = useResponseStore.getState();

			expect(response).toBeNull();
			expect(error).toBeNull();
		});
	});

	describe('setResponse', () => {
		it('should set a successful response', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: { 'content-type': 'application/json' },
				body: '{"success": true}',
				contentType: 'application/json',
				size: 18,
				time: 245,
				curlCommand: 'curl -X GET https://api.example.com'
			};

			useResponseStore.getState().setResponse(mockResponse);

			const { response, error } = useResponseStore.getState();
			expect(response).toEqual(mockResponse);
			expect(error).toBeNull();
		});

		it('should set response with 404 status', () => {
			const mockResponse: HttpResponse = {
				status: 404,
				statusText: 'Not Found',
				headers: { 'content-type': 'application/json' },
				body: '{"error": "User not found"}',
				contentType: 'application/json',
				size: 27,
				time: 150,
				curlCommand: 'curl -X GET https://api.example.com/users/999'
			};

			useResponseStore.getState().setResponse(mockResponse);

			const { response } = useResponseStore.getState();
			expect(response?.status).toBe(404);
			expect(response?.statusText).toBe('Not Found');
		});

		it('should set response with empty body', () => {
			const mockResponse: HttpResponse = {
				status: 204,
				statusText: 'No Content',
				headers: {},
				body: '',
				contentType: '',
				size: 0,
				time: 100,
				curlCommand: 'curl -X DELETE https://api.example.com/users/123'
			};

			useResponseStore.getState().setResponse(mockResponse);

			const { response } = useResponseStore.getState();
			expect(response?.body).toBe('');
			expect(response?.size).toBe(0);
		});

		it('should clear error when setting response', () => {
			// First set an error
			useResponseStore.getState().setError('Network error');
			expect(useResponseStore.getState().error).toBe('Network error');

			// Then set a response
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'Success',
				contentType: 'text/plain',
				size: 7,
				time: 100,
				curlCommand: 'curl -X GET https://api.example.com'
			};

			useResponseStore.getState().setResponse(mockResponse);

			const { response, error } = useResponseStore.getState();
			expect(response).toEqual(mockResponse);
			expect(error).toBeNull();
		});

		it('should set response with multiple headers', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {
					'content-type': 'application/json',
					'cache-control': 'no-cache',
					'x-request-id': 'abc-123',
					'access-control-allow-origin': '*'
				},
				body: '{"data": []}',
				contentType: 'application/json',
				size: 12,
				time: 200,
				curlCommand: 'curl -X GET https://api.example.com'
			};

			useResponseStore.getState().setResponse(mockResponse);

			const { response } = useResponseStore.getState();
			expect(response?.headers).toHaveProperty('content-type');
			expect(response?.headers).toHaveProperty('cache-control');
			expect(response?.headers).toHaveProperty('x-request-id');
			expect(response?.headers['x-request-id']).toBe('abc-123');
		});

		it('should preserve timing information', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: '{}',
				contentType: 'application/json',
				size: 2,
				time: 1250, // 1.25 seconds
				curlCommand: 'curl ...'
			};

			useResponseStore.getState().setResponse(mockResponse);

			const { response } = useResponseStore.getState();
			expect(response?.time).toBe(1250);
		});

		it('should preserve curl command', () => {
			const curlCmd = 'curl -X POST https://api.example.com -H "Content-Type: application/json" -d \'{"test":true}\'';
			const mockResponse: HttpResponse = {
				status: 201,
				statusText: 'Created',
				headers: {},
				body: '{"id": 123}',
				contentType: 'application/json',
				size: 11,
				time: 300,
				curlCommand: curlCmd
			};

			useResponseStore.getState().setResponse(mockResponse);

			const { response } = useResponseStore.getState();
			expect(response?.curlCommand).toBe(curlCmd);
		});
	});

	describe('setError', () => {
		it('should set error message', () => {
			useResponseStore.getState().setError('Network timeout');

			const { error, response } = useResponseStore.getState();
			expect(error).toBe('Network timeout');
			expect(response).toBeNull();
		});

		it('should clear response when setting error', () => {
			// First set a response
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'Success',
				contentType: 'text/plain',
				size: 7,
				time: 100,
				curlCommand: 'curl ...'
			};

			useResponseStore.getState().setResponse(mockResponse);
			expect(useResponseStore.getState().response).toEqual(mockResponse);

			// Then set an error
			useResponseStore.getState().setError('Connection failed');

			const { response, error } = useResponseStore.getState();
			expect(response).toBeNull();
			expect(error).toBe('Connection failed');
		});

		it('should handle empty error message', () => {
			useResponseStore.getState().setError('');

			const { error } = useResponseStore.getState();
			expect(error).toBe('');
		});

		it('should handle long error messages', () => {
			const longError = 'A very long error message '.repeat(10);

			useResponseStore.getState().setError(longError);

			const { error } = useResponseStore.getState();
			expect(error).toBe(longError);
		});

		it('should replace previous error', () => {
			useResponseStore.getState().setError('First error');
			useResponseStore.getState().setError('Second error');

			const { error } = useResponseStore.getState();
			expect(error).toBe('Second error');
		});
	});

	describe('clearResponse', () => {
		it('should clear both response and error', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'Test',
				contentType: 'text/plain',
				size: 4,
				time: 100,
				curlCommand: 'curl ...'
			};

			useResponseStore.getState().setResponse(mockResponse);
			useResponseStore.getState().clearResponse();

			const { response, error } = useResponseStore.getState();
			expect(response).toBeNull();
			expect(error).toBeNull();
		});

		it('should clear error without response', () => {
			useResponseStore.getState().setError('Test error');
			useResponseStore.getState().clearResponse();

			const { error, response } = useResponseStore.getState();
			expect(error).toBeNull();
			expect(response).toBeNull();
		});

		it('should be idempotent', () => {
			useResponseStore.getState().clearResponse();
			useResponseStore.getState().clearResponse();
			useResponseStore.getState().clearResponse();

			const { response, error } = useResponseStore.getState();
			expect(response).toBeNull();
			expect(error).toBeNull();
		});

		it('should reset state after multiple operations', () => {
			// Set response
			useResponseStore.getState().setResponse({
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'OK',
				contentType: 'text/plain',
				size: 2,
				time: 50,
				curlCommand: 'curl ...'
			});

			// Set error
			useResponseStore.getState().setError('Error');

			// Clear
			useResponseStore.getState().clearResponse();

			const state = useResponseStore.getState();
			expect(state.response).toBeNull();
			expect(state.error).toBeNull();
		});
	});

	describe('state transitions', () => {
		it('should handle response → error → response transition', () => {
			const response1: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'First',
				contentType: 'text/plain',
				size: 5,
				time: 100,
				curlCommand: 'curl ...'
			};

			const response2: HttpResponse = {
				status: 201,
				statusText: 'Created',
				headers: {},
				body: 'Second',
				contentType: 'text/plain',
				size: 6,
				time: 150,
				curlCommand: 'curl ...'
			};

			// Set first response
			useResponseStore.getState().setResponse(response1);
			expect(useResponseStore.getState().response?.body).toBe('First');

			// Set error
			useResponseStore.getState().setError('Network error');
			expect(useResponseStore.getState().error).toBe('Network error');
			expect(useResponseStore.getState().response).toBeNull();

			// Set second response
			useResponseStore.getState().setResponse(response2);
			expect(useResponseStore.getState().response?.body).toBe('Second');
			expect(useResponseStore.getState().error).toBeNull();
		});

		it('should handle rapid state changes', () => {
			useResponseStore.getState().setError('Error 1');
			useResponseStore.getState().setError('Error 2');
			useResponseStore.getState().setError('Error 3');

			expect(useResponseStore.getState().error).toBe('Error 3');
		});
	});

	describe('response references', () => {
		it('should store response reference (not a deep clone)', () => {
			const originalResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: { 'x-test': 'value' },
				body: 'Original',
				contentType: 'text/plain',
				size: 8,
				time: 100,
				curlCommand: 'curl ...'
			};

			useResponseStore.getState().setResponse(originalResponse);

			const { response } = useResponseStore.getState();

			// Zustand stores the reference, not a deep clone
			expect(response).toBe(originalResponse);
		});

		it('should correctly replace response on new setResponse', () => {
			const firstResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'First',
				contentType: 'text/plain',
				size: 5,
				time: 100,
				curlCommand: 'curl ...'
			};

			const secondResponse: HttpResponse = {
				status: 201,
				statusText: 'Created',
				headers: {},
				body: 'Second',
				contentType: 'text/plain',
				size: 6,
				time: 150,
				curlCommand: 'curl ...'
			};

			useResponseStore.getState().setResponse(firstResponse);
			useResponseStore.getState().setResponse(secondResponse);

			const { response } = useResponseStore.getState();
			expect(response).toBe(secondResponse);
			expect(response?.body).toBe('Second');
		});
	});
});
