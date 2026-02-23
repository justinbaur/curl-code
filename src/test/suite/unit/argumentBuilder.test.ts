import { expect } from 'chai';
import { ArgumentBuilder } from '../../../curl/argumentBuilder';
import { createMockRequest } from '../../utils/testHelpers';

describe('ArgumentBuilder', () => {
	let builder: ArgumentBuilder;

	beforeEach(() => {
		builder = new ArgumentBuilder();
	});

	describe('build()', () => {
		it('should build basic GET request', () => {
			// Arrange
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/users'
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			// Act
			const args = builder.build(request, options);

			// Assert
			expect(args).to.include('--request');
			expect(args).to.include('GET');
			expect(args).to.include('https://api.example.com/users');
			expect(args).to.include('--max-time');
			expect(args).to.include('30');
		});

		it('should build POST request with JSON body', () => {
			const request = createMockRequest({
				method: 'POST',
				url: 'https://api.example.com/users',
				body: { type: 'json', content: '{"name":"John"}' }
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--request');
			expect(args).to.include('POST');
			expect(args).to.include('--header');
			expect(args).to.include('Content-Type: application/json');
			expect(args).to.include('--data');
			expect(args).to.include('{"name":"John"}');
		});

		it('should add custom headers', () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/users',
				headers: [
					{ key: 'X-Custom-Header', value: 'custom-value', enabled: true },
					{ key: 'Accept', value: 'application/json', enabled: true }
				]
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('X-Custom-Header: custom-value');
			expect(args).to.include('Accept: application/json');
		});

		it('should skip disabled headers', () => {
			const request = createMockRequest({
				headers: [
					{ key: 'Enabled', value: 'yes', enabled: true },
					{ key: 'Disabled', value: 'no', enabled: false }
				]
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);
			const argsString = args.join(' ');

			expect(argsString).to.include('Enabled: yes');
			expect(argsString).to.not.include('Disabled: no');
		});

		it('should add query parameters', () => {
			const request = createMockRequest({
				url: 'https://api.example.com/users',
				queryParams: [
					{ key: 'page', value: '1', enabled: true },
					{ key: 'limit', value: '10', enabled: true }
				]
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			// Find the URL argument
			const urlArg = args.find(arg => arg.includes('https://api.example.com/users'));
			expect(urlArg).to.exist;
			expect(urlArg).to.include('?page=1');
			expect(urlArg).to.include('limit=10');
		});

		it('should add basic authentication', () => {
			const request = createMockRequest({
				auth: { type: 'basic', username: 'admin', password: 'secret' }
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--user');
			expect(args).to.include('admin:secret');
		});

		it('should add bearer token authentication', () => {
			const request = createMockRequest({
				auth: { type: 'bearer', token: 'my-secret-token' }
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--header');
			expect(args).to.include('Authorization: Bearer my-secret-token');
		});

		it('should add API key header authentication', () => {
			const request = createMockRequest({
				auth: {
					type: 'api-key',
					apiKeyName: 'X-API-Key',
					apiKeyValue: 'key123',
					apiKeyLocation: 'header'
				}
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--header');
			expect(args).to.include('X-API-Key: key123');
		});

		it('should add follow redirects flag', () => {
			const request = createMockRequest({});
			const options = { followRedirects: true, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--location');
		});

		it('should add skip SSL verification flag', () => {
			const request = createMockRequest({});
			const options = { followRedirects: false, verifySSL: false, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--insecure');
		});

		it('should handle form-data body', () => {
			const request = createMockRequest({
				method: 'POST',
				body: {
					type: 'form-data',
					content: '',
					formData: [
						{ key: 'name', value: 'John', type: 'text', enabled: true },
						{ key: 'avatar', value: '/path/to/file.jpg', type: 'file', enabled: true }
					]
				}
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--form');
			expect(args).to.include('name=John');
			expect(args).to.include('avatar=@/path/to/file.jpg');
		});

		it('should handle x-www-form-urlencoded body', () => {
			const request = createMockRequest({
				method: 'POST',
				body: {
					type: 'x-www-form-urlencoded',
					content: 'name=John&age=30'
				}
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.include('--header');
			expect(args).to.include('Content-Type: application/x-www-form-urlencoded');
			expect(args).to.include('--data');
			expect(args).to.include('name=John&age=30');
		});

		it('should convert timeout from ms to seconds', () => {
			const request = createMockRequest({});
			const options = { followRedirects: false, verifySSL: true, timeout: 15000 };

			const args = builder.build(request, options);

			expect(args).to.include('--max-time');
			expect(args).to.include('15');
		});

		it('should handle empty body', () => {
			const request = createMockRequest({
				method: 'POST',
				body: { type: 'none', content: '' }
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);

			expect(args).to.not.include('--data');
		});

		it('should skip disabled query parameters', () => {
			const request = createMockRequest({
				url: 'https://api.example.com/users',
				queryParams: [
					{ key: 'enabled', value: 'yes', enabled: true },
					{ key: 'disabled', value: 'no', enabled: false }
				]
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const args = builder.build(request, options);
			const url = args.find(arg => arg.startsWith('http'));

			expect(url).to.include('enabled=yes');
			expect(url).to.not.include('disabled=no');
		});
	});

	describe('buildCommand()', () => {
		it('should build full cURL command string', () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/users'
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const command = builder.buildCommand(request, options);

			expect(command).to.include('curl');
			expect(command).to.include('--request');
			expect(command).to.include('GET');
			expect(command).to.include('https://api.example.com/users');
		});

		it('should escape arguments with special characters', () => {
			const request = createMockRequest({
				headers: [
					{ key: 'Authorization', value: 'Bearer token with spaces', enabled: true }
				]
			});
			const options = { followRedirects: false, verifySSL: true, timeout: 30000 };

			const command = builder.buildCommand(request, options);

			// Should be quoted because it contains spaces
			expect(command).to.match(/['"]Authorization: Bearer token with spaces['"]/);
		});
	});
});
