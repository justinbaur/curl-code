import { expect } from 'chai';
import { ArgumentBuilder } from '../../../curl/argumentBuilder';
import { createMockRequest } from '../../utils/testHelpers';
import { createDefaultAdvancedOptions } from '../../../types/request';

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

			// Find the URL argument by parsing and checking origin and pathname
			const urlArg = args.find(arg => {
				try {
					const parsed = new URL(arg);
					return parsed.origin === 'https://api.example.com' && parsed.pathname === '/users';
				} catch {
					return false;
				}
			});
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

	describe('advanced options', () => {
		const defaultOptions = { followRedirects: false, verifySSL: true, timeout: 30000 };

		it('should not add advanced args when advanced is undefined', () => {
			const request = createMockRequest({});
			const args = builder.build(request, defaultOptions);
			expect(args).to.not.include('--http2');
			expect(args).to.not.include('--compressed');
		});

		it('should add HTTP/2 version flag', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), httpVersion: 'http2' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--http2');
		});

		it('should add HTTP/3 only version flag', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), httpVersion: 'http3-only' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--http3-only');
		});

		it('should not add HTTP version flag when set to default', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), httpVersion: 'default' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.not.include('--http1.1');
			expect(args).to.not.include('--http2');
			expect(args).to.not.include('--http3');
		});

		it('should add connect-timeout', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), connectTimeout: '5' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--connect-timeout');
			expect(args).to.include('5');
		});

		it('should add keepalive-time', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), keepaliveTime: '60' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--keepalive-time');
			expect(args).to.include('60');
		});

		it('should add no-keepalive toggle', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), noKeepalive: true }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--no-keepalive');
		});

		it('should add tcp-nodelay toggle', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), tcpNodelay: true }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--tcp-nodelay');
		});

		it('should add cookie string', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), cookie: 'session=abc123' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--cookie');
			expect(args).to.include('session=abc123');
		});

		it('should add cookie jar', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), cookieJar: '/tmp/cookies.txt' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--cookie-jar');
			expect(args).to.include('/tmp/cookies.txt');
		});

		it('should add proxy settings', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					proxy: 'http://proxy:8080',
					proxyUser: 'user:pass',
					noproxy: 'localhost,127.0.0.1'
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--proxy');
			expect(args).to.include('http://proxy:8080');
			expect(args).to.include('--proxy-user');
			expect(args).to.include('user:pass');
			expect(args).to.include('--noproxy');
			expect(args).to.include('localhost,127.0.0.1');
		});

		it('should add TLS version flag', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), tlsVersion: 'tlsv1.3' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--tlsv1.3');
		});

		it('should not add TLS version when set to default', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), tlsVersion: 'default' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.not.include('--tlsv1.0');
			expect(args).to.not.include('--tlsv1.2');
			expect(args).to.not.include('--tlsv1.3');
		});

		it('should add certificate flags', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					caCert: '/path/ca.pem',
					clientCert: '/path/cert.pem',
					clientKey: '/path/key.pem'
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--cacert');
			expect(args).to.include('/path/ca.pem');
			expect(args).to.include('--cert');
			expect(args).to.include('/path/cert.pem');
			expect(args).to.include('--key');
			expect(args).to.include('/path/key.pem');
		});

		it('should add redirect flags', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					maxRedirs: '5',
					locationTrusted: true,
					post301: true,
					post302: true,
					post303: true
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--max-redirs');
			expect(args).to.include('5');
			expect(args).to.include('--location-trusted');
			expect(args).to.include('--post301');
			expect(args).to.include('--post302');
			expect(args).to.include('--post303');
		});

		it('should add retry flags', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					retry: '3',
					retryDelay: '1',
					retryMaxTime: '30'
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--retry');
			expect(args).to.include('3');
			expect(args).to.include('--retry-delay');
			expect(args).to.include('1');
			expect(args).to.include('--retry-max-time');
			expect(args).to.include('30');
		});

		it('should add compressed flag', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), compressed: true }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--compressed');
		});

		it('should add verbose flag', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), verbose: true }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--verbose');
		});

		it('should add auth extension flags', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					digest: true,
					ntlm: true,
					negotiate: true
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--digest');
			expect(args).to.include('--ntlm');
			expect(args).to.include('--negotiate');
		});

		it('should add aws-sigv4 provider', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), awsSigv4: 'aws:amz:us-east-1:s3' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--aws-sigv4');
			expect(args).to.include('aws:amz:us-east-1:s3');
		});

		it('should add oauth2-bearer token', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), oauth2Bearer: 'my-token' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--oauth2-bearer');
			expect(args).to.include('my-token');
		});

		it('should add DNS resolution flags', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					resolve: 'example.com:443:127.0.0.1',
					connectTo: 'example.com:443:localhost:8443'
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--resolve');
			expect(args).to.include('example.com:443:127.0.0.1');
			expect(args).to.include('--connect-to');
			expect(args).to.include('example.com:443:localhost:8443');
		});

		it('should add rate limiting flags', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					limitRate: '100K',
					maxFilesize: '1048576'
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--limit-rate');
			expect(args).to.include('100K');
			expect(args).to.include('--max-filesize');
			expect(args).to.include('1048576');
		});

		it('should add user-agent', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), userAgent: 'MyApp/1.0' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--user-agent');
			expect(args).to.include('MyApp/1.0');
		});

		it('should add referer', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), referer: 'https://example.com' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--referer');
			expect(args).to.include('https://example.com');
		});

		it('should parse simple raw flags', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), rawFlags: '--verbose --compressed' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--verbose');
			expect(args).to.include('--compressed');
		});

		it('should parse raw flags with double-quoted values', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), rawFlags: '--header "X-Custom: value with spaces"' }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--header');
			expect(args).to.include('X-Custom: value with spaces');
		});

		it('should parse raw flags with single-quoted values', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), rawFlags: "--cookie 'session=abc123'" }
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--cookie');
			expect(args).to.include('session=abc123');
		});

		it('should ignore empty raw flags', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), rawFlags: '' }
			});
			const args = builder.build(request, defaultOptions);
			// Should only have the standard flags, no extras
			const argsWithoutStandard = args.filter(a =>
				!['--request', 'GET', '--max-time', '30'].includes(a) &&
				!a.startsWith('https://')
			);
			expect(argsWithoutStandard).to.have.length(0);
		});

		it('should ignore whitespace-only raw flags', () => {
			const request = createMockRequest({
				advanced: { ...createDefaultAdvancedOptions(), rawFlags: '   ' }
			});
			const args = builder.build(request, defaultOptions);
			const argsWithoutStandard = args.filter(a =>
				!['--request', 'GET', '--max-time', '30'].includes(a) &&
				!a.startsWith('https://')
			);
			expect(argsWithoutStandard).to.have.length(0);
		});

		it('should append raw flags after structured flags', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					compressed: true,
					rawFlags: '--verbose'
				}
			});
			const args = builder.build(request, defaultOptions);
			const compressedIdx = args.indexOf('--compressed');
			const verboseIdx = args.indexOf('--verbose');
			expect(compressedIdx).to.be.lessThan(verboseIdx);
		});

		it('should handle combination of multiple advanced options', () => {
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					httpVersion: 'http2',
					compressed: true,
					proxy: 'http://proxy:8080',
					cookie: 'session=abc',
					retry: '3',
					userAgent: 'TestAgent/1.0'
				}
			});
			const args = builder.build(request, defaultOptions);
			expect(args).to.include('--http2');
			expect(args).to.include('--compressed');
			expect(args).to.include('--proxy');
			expect(args).to.include('http://proxy:8080');
			expect(args).to.include('--cookie');
			expect(args).to.include('session=abc');
			expect(args).to.include('--retry');
			expect(args).to.include('3');
			expect(args).to.include('--user-agent');
			expect(args).to.include('TestAgent/1.0');
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
