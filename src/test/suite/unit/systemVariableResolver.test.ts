import { expect } from 'chai';
import * as path from 'path';
import { SystemVariableResolver, resolveUrlEncodedVar } from '../../../parsers/systemVariableResolver';

// Fixtures directory contains rest-client-dotenv.env (renamed to .env for tests via helper)
const fixturesDir = path.resolve(__dirname, '../../fixtures');

describe('SystemVariableResolver', () => {
	describe('$guid', () => {
		it('should produce a valid UUID v4', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$guid}}');
			expect(result).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		});

		it('should produce unique values per occurrence', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$guid}} {{$guid}}');
			const [a, b] = result.split(' ');
			expect(a).to.not.equal(b);
		});
	});

	describe('$timestamp', () => {
		it('should produce a Unix timestamp close to now', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$timestamp}}');
			const ts = parseInt(result, 10);
			const nowSec = Math.floor(Date.now() / 1000);
			expect(ts).to.be.within(nowSec - 2, nowSec + 2);
		});
	});

	describe('$randomInt', () => {
		it('should produce an integer in [min, max)', () => {
			const resolver = new SystemVariableResolver();
			for (let i = 0; i < 50; i++) {
				const result = resolver.resolveText('{{$randomInt 1 100}}');
				const num = parseInt(result, 10);
				expect(num).to.be.at.least(1);
				expect(num).to.be.below(100);
			}
		});

		it('should return original text with no args', () => {
			const resolver = new SystemVariableResolver();
			expect(resolver.resolveText('{{$randomInt}}')).to.equal('{{$randomInt}}');
		});

		it('should return original text with invalid args', () => {
			const resolver = new SystemVariableResolver();
			expect(resolver.resolveText('{{$randomInt abc def}}')).to.equal('{{$randomInt abc def}}');
		});

		it('should return original text when min >= max', () => {
			const resolver = new SystemVariableResolver();
			expect(resolver.resolveText('{{$randomInt 10 5}}')).to.equal('{{$randomInt 10 5}}');
			expect(resolver.resolveText('{{$randomInt 5 5}}')).to.equal('{{$randomInt 5 5}}');
		});
	});

	describe('$datetime', () => {
		it('should produce ISO 8601 by default', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$datetime iso8601}}');
			// ISO 8601 format: 2026-03-22T12:34:56.789Z
			expect(result).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
		});

		it('should produce RFC 1123 format', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$datetime rfc1123}}');
			// RFC 1123 format: Sun, 22 Mar 2026 12:34:56 GMT
			expect(result).to.match(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
		});

		it('should default to ISO 8601 with no format', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$datetime}}');
			expect(result).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
		});
	});

	describe('$localDatetime', () => {
		it('should produce ISO 8601 with timezone offset', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$localDatetime iso8601}}');
			// Local ISO 8601: 2026-03-22T12:34:56+05:00 or 2026-03-22T12:34:56-04:00
			expect(result).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
		});

		it('should produce RFC 1123 with timezone offset', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$localDatetime rfc1123}}');
			// Local RFC 1123: Sun, 22 Mar 2026 12:34:56 +0500
			expect(result).to.match(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/);
		});
	});

	describe('$processEnv', () => {
		it('should resolve existing environment variables', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$processEnv PATH}}');
			expect(result).to.equal(process.env.PATH);
		});

		it('should leave unresolvable variables as-is', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$processEnv __CURL_CODE_TEST_NONEXISTENT_VAR__}}');
			expect(result).to.equal('{{$processEnv __CURL_CODE_TEST_NONEXISTENT_VAR__}}');
		});

		it('should return original with no args', () => {
			const resolver = new SystemVariableResolver();
			expect(resolver.resolveText('{{$processEnv}}')).to.equal('{{$processEnv}}');
		});
	});

	describe('$dotenv', () => {
		it('should resolve variables from co-located .env file', () => {
			// The fixtures dir has rest-client-dotenv.env — we need a real .env file
			// Create a resolver pointing to fixtures with a temporary .env
			const fs = require('fs');
			const tmpDir = path.join(fixturesDir, '__dotenv_test__');
			fs.mkdirSync(tmpDir, { recursive: true });
			fs.writeFileSync(path.join(tmpDir, '.env'), 'API_HOST=httpbin.org\nAPI_TOKEN=secret123\n');

			try {
				const resolver = new SystemVariableResolver(tmpDir);
				expect(resolver.resolveText('{{$dotenv API_HOST}}')).to.equal('httpbin.org');
				expect(resolver.resolveText('{{$dotenv API_TOKEN}}')).to.equal('secret123');
			} finally {
				fs.rmSync(tmpDir, { recursive: true });
			}
		});

		it('should leave variable unresolved when key not found in .env', () => {
			const fs = require('fs');
			const tmpDir = path.join(fixturesDir, '__dotenv_test2__');
			fs.mkdirSync(tmpDir, { recursive: true });
			fs.writeFileSync(path.join(tmpDir, '.env'), 'FOO=bar\n');

			try {
				const resolver = new SystemVariableResolver(tmpDir);
				expect(resolver.resolveText('{{$dotenv MISSING_KEY}}')).to.equal('{{$dotenv MISSING_KEY}}');
			} finally {
				fs.rmSync(tmpDir, { recursive: true });
			}
		});

		it('should leave variable unresolved when no .env file exists', () => {
			const resolver = new SystemVariableResolver('/tmp/__curl_code_no_env_here__');
			expect(resolver.resolveText('{{$dotenv SOME_VAR}}')).to.equal('{{$dotenv SOME_VAR}}');
		});

		it('should leave variable unresolved when no directory provided', () => {
			const resolver = new SystemVariableResolver();
			expect(resolver.resolveText('{{$dotenv SOME_VAR}}')).to.equal('{{$dotenv SOME_VAR}}');
		});

		it('should return original with no args', () => {
			const resolver = new SystemVariableResolver(fixturesDir);
			expect(resolver.resolveText('{{$dotenv}}')).to.equal('{{$dotenv}}');
		});
	});

	describe('mixed variables', () => {
		it('should resolve system variables while leaving user variables untouched', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$timestamp}}|{{userVar}}|{{$guid}}');
			const parts = result.split('|');
			// First part: resolved timestamp (numeric)
			expect(parts[0]).to.match(/^\d+$/);
			// Middle part: untouched user variable
			expect(parts[1]).to.equal('{{userVar}}');
			// Last part: resolved UUID
			expect(parts[2]).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4/);
		});

		it('should resolve multiple different system variables in one string', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('id={{$guid}}&ts={{$timestamp}}&r={{$randomInt 1 1000}}');
			expect(result).to.not.include('$guid');
			expect(result).to.not.include('$timestamp');
			expect(result).to.not.include('$randomInt');
		});
	});

	describe('resolveInRequest', () => {
		it('should resolve system variables in URL, headers, and body', () => {
			const resolver = new SystemVariableResolver();
			const request = {
				id: 'test',
				name: 'test',
				method: 'POST' as const,
				url: 'https://api.example.com/{{$guid}}',
				headers: [{ key: 'X-Request-Id', value: '{{$guid}}', enabled: true }],
				queryParams: [{ key: 'ts', value: '{{$timestamp}}', enabled: true }],
				body: { type: 'json' as const, content: '{"id": "{{$guid}}"}' },
				auth: { type: 'bearer' as const, token: '{{$processEnv PATH}}' },
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			const resolved = resolver.resolveInRequest(request);

			// URL should have UUID instead of $guid
			expect(resolved.url).to.not.include('$guid');
			expect(resolved.url).to.match(/\/[0-9a-f]{8}-/);

			// Header value resolved
			expect(resolved.headers[0].value).to.match(/^[0-9a-f]{8}-/);

			// Query param resolved
			expect(resolved.queryParams[0].value).to.match(/^\d+$/);

			// Body resolved
			expect(resolved.body.content).to.not.include('$guid');

			// Auth token resolved
			expect(resolved.auth.token).to.equal(process.env.PATH);
		});
	});

	describe('$timestamp with offset', () => {
		it('should apply positive hour offset', () => {
			const resolver = new SystemVariableResolver();
			const result = parseInt(resolver.resolveText('{{$timestamp 1 h}}'), 10);
			const expected = Math.floor(Date.now() / 1000) + 3600;
			expect(result).to.be.within(expected - 2, expected + 2);
		});

		it('should apply negative day offset', () => {
			const resolver = new SystemVariableResolver();
			const result = parseInt(resolver.resolveText('{{$timestamp -1 d}}'), 10);
			const expected = Math.floor(Date.now() / 1000) - 86400;
			expect(result).to.be.within(expected - 2, expected + 2);
		});

		it('should return current timestamp with no offset', () => {
			const resolver = new SystemVariableResolver();
			const result = parseInt(resolver.resolveText('{{$timestamp}}'), 10);
			const expected = Math.floor(Date.now() / 1000);
			expect(result).to.be.within(expected - 2, expected + 2);
		});
	});

	describe('$datetime with offset', () => {
		it('should apply offset to iso8601 format', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$datetime iso8601 1 d}}');
			// Should be a valid ISO 8601 date, roughly tomorrow
			expect(result).to.match(/^\d{4}-\d{2}-\d{2}T/);
			const parsed = new Date(result);
			const tomorrow = new Date(Date.now() + 86400000);
			expect(parsed.getDate()).to.equal(tomorrow.getUTCDate());
		});

		it('should apply negative offset to rfc1123 format', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$datetime rfc1123 -3 h}}');
			expect(result).to.match(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
		});

		it('should handle week offset', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$timestamp 1 w}}');
			const expected = Math.floor(Date.now() / 1000) + 7 * 86400;
			const parsed = parseInt(result, 10);
			expect(parsed).to.be.within(expected - 2, expected + 2);
		});

		it('should handle minute offset', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$timestamp -30 m}}');
			const expected = Math.floor(Date.now() / 1000) - 1800;
			const parsed = parseInt(result, 10);
			expect(parsed).to.be.within(expected - 2, expected + 2);
		});
	});

	describe('$localDatetime with offset', () => {
		it('should apply offset to local iso8601', () => {
			const resolver = new SystemVariableResolver();
			const result = resolver.resolveText('{{$localDatetime iso8601 1 d}}');
			expect(result).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
		});
	});

	describe('resolveUrlEncodedVar', () => {
		it('should percent-encode a resolved variable', () => {
			const resolve = (expr: string) => expr === '{{name}}' ? 'Strunk & White' : expr;
			const result = resolveUrlEncodedVar('{{%name}}', resolve);
			expect(result).to.equal('Strunk%20%26%20White');
		});

		it('should leave unresolvable {{%...}} as-is', () => {
			const resolve = (expr: string) => expr; // no-op resolver
			const result = resolveUrlEncodedVar('{{%unknown}}', resolve);
			expect(result).to.equal('{{%unknown}}');
		});

		it('should handle multiple encoded variables', () => {
			const vars: Record<string, string> = { a: 'hello world', b: 'foo/bar' };
			const resolve = (expr: string) => {
				const m = expr.match(/\{\{(\w+)\}\}/);
				return m && vars[m[1]] ? vars[m[1]] : expr;
			};
			const result = resolveUrlEncodedVar('{{%a}}&{{%b}}', resolve);
			expect(result).to.equal('hello%20world&foo%2Fbar');
		});

		it('should not double-encode already-encoded text', () => {
			const resolve = (expr: string) => expr === '{{val}}' ? 'a b' : expr;
			const result = resolveUrlEncodedVar('{{%val}}', resolve);
			expect(result).to.equal('a%20b');
		});
	});
});
