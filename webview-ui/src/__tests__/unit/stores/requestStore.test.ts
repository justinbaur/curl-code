import { describe, it, expect, beforeEach } from 'vitest';
import { useRequestStore } from '../../../state/requestStore';
import type { HttpRequest } from '../../../vscode';

describe('requestStore', () => {
	beforeEach(() => {
		// Reset store before each test
		useRequestStore.getState().reset();
	});

	describe('initial state', () => {
		it('should initialize with default request', () => {
			const { request, isLoading } = useRequestStore.getState();

			expect(request).toBeDefined();
			expect(request?.name).toBe('New Request');
			expect(request?.method).toBe('GET');
			expect(request?.url).toBe('');
			expect(request?.headers).toEqual([]);
			expect(request?.queryParams).toEqual([]);
			expect(request?.body).toEqual({ type: 'none', content: '' });
			expect(request?.auth).toEqual({ type: 'none' });
			expect(isLoading).toBe(false);
		});
	});

	describe('setRequest', () => {
		it('should replace entire request', () => {
			const newRequest: HttpRequest = {
				id: 'test-1',
				name: 'Test Request',
				method: 'POST',
				url: 'https://api.example.com/users',
				headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
				queryParams: [],
				body: { type: 'json', content: '{"test": true}' },
				auth: { type: 'none' },
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			useRequestStore.getState().setRequest(newRequest);

			const { request } = useRequestStore.getState();
			expect(request).toEqual(newRequest);
		});

		it('should update request with different method', () => {
			const newRequest: HttpRequest = {
				id: 'test-2',
				name: 'PUT Request',
				method: 'PUT',
				url: 'https://api.example.com/users/123',
				headers: [],
				queryParams: [],
				body: { type: 'none', content: '' },
				auth: { type: 'none' },
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			useRequestStore.getState().setRequest(newRequest);

			const { request } = useRequestStore.getState();
			expect(request?.method).toBe('PUT');
			expect(request?.url).toBe('https://api.example.com/users/123');
		});
	});

	describe('updateRequest', () => {
		it('should update specific fields while preserving others', () => {
			const initialRequest: HttpRequest = {
				id: 'test-3',
				name: 'Initial Request',
				method: 'GET',
				url: 'https://api.example.com/test',
				headers: [],
				queryParams: [],
				body: { type: 'none', content: '' },
				auth: { type: 'none' },
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			useRequestStore.getState().setRequest(initialRequest);

			// Update only the URL
			useRequestStore.getState().updateRequest({ url: 'https://api.example.com/updated' });

			const { request } = useRequestStore.getState();
			expect(request?.url).toBe('https://api.example.com/updated');
			expect(request?.method).toBe('GET'); // Unchanged
			expect(request?.name).toBe('Initial Request'); // Unchanged
		});

		it('should update method', () => {
			useRequestStore.getState().updateRequest({ method: 'POST' });

			const { request } = useRequestStore.getState();
			expect(request?.method).toBe('POST');
		});

		it('should update headers', () => {
			const headers = [
				{ key: 'Authorization', value: 'Bearer token', enabled: true },
				{ key: 'Content-Type', value: 'application/json', enabled: true }
			];

			useRequestStore.getState().updateRequest({ headers });

			const { request } = useRequestStore.getState();
			expect(request?.headers).toEqual(headers);
		});

		it('should update query parameters', () => {
			const queryParams = [
				{ key: 'page', value: '1', enabled: true },
				{ key: 'limit', value: '10', enabled: true }
			];

			useRequestStore.getState().updateRequest({ queryParams });

			const { request } = useRequestStore.getState();
			expect(request?.queryParams).toEqual(queryParams);
		});

		it('should update body', () => {
			const body = { type: 'json' as const, content: '{"name": "John"}' };

			useRequestStore.getState().updateRequest({ body });

			const { request } = useRequestStore.getState();
			expect(request?.body).toEqual(body);
		});

		it('should update auth configuration', () => {
			const auth = {
				type: 'bearer' as const,
				token: 'my-secret-token'
			};

			useRequestStore.getState().updateRequest({ auth });

			const { request } = useRequestStore.getState();
			expect(request?.auth).toEqual(auth);
		});

		it('should update updatedAt timestamp', () => {
			const initialRequest: HttpRequest = {
				id: 'test-4',
				name: 'Test',
				method: 'GET',
				url: 'https://api.example.com',
				headers: [],
				queryParams: [],
				body: { type: 'none', content: '' },
				auth: { type: 'none' },
				createdAt: Date.now(),
				updatedAt: Date.now() - 1000 // 1 second ago
			};

			useRequestStore.getState().setRequest(initialRequest);
			const oldTimestamp = useRequestStore.getState().request?.updatedAt;

			// Wait a tiny bit to ensure timestamp changes
			setTimeout(() => {
				useRequestStore.getState().updateRequest({ url: 'https://api.example.com/new' });

				const { request } = useRequestStore.getState();
				expect(request?.updatedAt).toBeGreaterThan(oldTimestamp!);
			}, 10);
		});

		it('should handle multiple field updates', () => {
			const updates = {
				method: 'POST' as const,
				url: 'https://api.example.com/create',
				body: { type: 'json' as const, content: '{"data": "test"}' }
			};

			useRequestStore.getState().updateRequest(updates);

			const { request } = useRequestStore.getState();
			expect(request?.method).toBe('POST');
			expect(request?.url).toBe('https://api.example.com/create');
			expect(request?.body).toEqual({ type: 'json', content: '{"data": "test"}' });
		});
	});

	describe('setLoading', () => {
		it('should set loading to true', () => {
			useRequestStore.getState().setLoading(true);

			const { isLoading } = useRequestStore.getState();
			expect(isLoading).toBe(true);
		});

		it('should set loading to false', () => {
			useRequestStore.getState().setLoading(true);
			useRequestStore.getState().setLoading(false);

			const { isLoading } = useRequestStore.getState();
			expect(isLoading).toBe(false);
		});
	});

	describe('reset', () => {
		it('should reset request to initial state', () => {
			// Set a custom request
			const customRequest: HttpRequest = {
				id: 'custom',
				name: 'Custom Request',
				method: 'DELETE',
				url: 'https://api.example.com/delete',
				headers: [{ key: 'X-Custom', value: 'value', enabled: true }],
				queryParams: [{ key: 'id', value: '123', enabled: true }],
				body: { type: 'raw', content: 'test data' },
				auth: { type: 'basic', username: 'user', password: 'pass' },
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			useRequestStore.getState().setRequest(customRequest);
			useRequestStore.getState().setLoading(true);

			// Reset
			useRequestStore.getState().reset();

			const { request, isLoading } = useRequestStore.getState();
			expect(request?.name).toBe('New Request');
			expect(request?.method).toBe('GET');
			expect(request?.url).toBe('');
			expect(request?.headers).toEqual([]);
			expect(request?.queryParams).toEqual([]);
			expect(isLoading).toBe(false);
		});

		it('should clear loading state on reset', () => {
			useRequestStore.getState().setLoading(true);
			useRequestStore.getState().reset();

			const { isLoading } = useRequestStore.getState();
			expect(isLoading).toBe(false);
		});
	});

	describe('request immutability', () => {
		it('should not mutate original request on update', () => {
			const originalRequest: HttpRequest = {
				id: 'test-5',
				name: 'Original',
				method: 'GET',
				url: 'https://api.example.com',
				headers: [],
				queryParams: [],
				body: { type: 'none', content: '' },
				auth: { type: 'none' },
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			useRequestStore.getState().setRequest(originalRequest);
			const originalUrl = originalRequest.url;

			useRequestStore.getState().updateRequest({ url: 'https://api.example.com/new' });

			// Original object should not be mutated
			expect(originalRequest.url).toBe(originalUrl);

			// Store should have new URL
			const { request } = useRequestStore.getState();
			expect(request?.url).toBe('https://api.example.com/new');
		});
	});
});
