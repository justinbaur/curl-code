/**
 * Integration tests for CurlExecutor
 * These tests run in VS Code environment where vscode module is available
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { childProcessFacade } from '../../../utils/childProcessWrapper';
import { CurlExecutor, RequestCancelledError } from '../../../curl/executor';
import { createMockRequest, createMockAuth } from '../../utils/testHelpers';
import type { EnvironmentService } from '../../../services/EnvironmentService';
import type { CollectionService } from '../../../services/CollectionService';

/**
 * Mock ChildProcess for testing cURL execution.
 *
 * By default, kill() emits 'close' immediately (preserving existing test
 * behaviour).  Set `autoCloseOnKill = false` to control when 'close' fires,
 * which is needed for SIGKILL-escalation tests.
 */
class MockChildProcess extends EventEmitter {
	stdout = new EventEmitter();
	stderr = new EventEmitter();
	stdin = new EventEmitter();
	killed = false;
	/** Signals received via kill(), in order */
	killSignals: string[] = [];
	/** When true, kill() automatically emits 'close' (default for back-compat) */
	autoCloseOnKill = true;

	kill(signal?: string): boolean {
		this.killed = true;
		this.killSignals.push(signal || 'SIGTERM');
		if (this.autoCloseOnKill) {
			this.emit('close', null);
		}
		return true;
	}
}

describe('CurlExecutor Integration', () => {
	let executor: CurlExecutor;
	let spawnStub: sinon.SinonStub;
	let mockProcess: MockChildProcess;
	let getConfigurationStub: sinon.SinonStub;

	beforeEach(() => {
		// Stub VS Code configuration
		const mockConfig = {
			get: sinon.stub()
		};
		mockConfig.get.withArgs('curlPath', 'curl').returns('curl');
		mockConfig.get.withArgs('followRedirects', true).returns(true);
		mockConfig.get.withArgs('verifySSL', true).returns(true);
		mockConfig.get.withArgs('timeout', 600000).returns(30000);

		getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);
		mockProcess = new MockChildProcess();
		spawnStub = sinon.stub(childProcessFacade, 'spawn').returns(mockProcess as any);
		executor = new CurlExecutor();
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('constructor', () => {
		it('should create executor without services', () => {
			const exec = new CurlExecutor();
			expect(exec).to.be.instanceOf(CurlExecutor);
		});

		it('should create executor with environment service', () => {
			const mockEnvService = {} as EnvironmentService;
			const exec = new CurlExecutor(mockEnvService);
			expect(exec).to.be.instanceOf(CurlExecutor);
		});

		it('should create executor with both services', () => {
			const mockEnvService = {} as EnvironmentService;
			const mockCollectionService = {} as CollectionService;
			const exec = new CurlExecutor(mockEnvService, mockCollectionService);
			expect(exec).to.be.instanceOf(CurlExecutor);
		});
	});

	describe('execute', () => {
		it('should execute a simple GET request', async () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/users'
			});

			const responsePromise = executor.execute(request);

			// Simulate successful cURL output
			const curlOutput =
				'HTTP/1.1 200 OK\r\n' +
				'Content-Type: application/json\r\n' +
				'\r\n' +
				'{"users": []}' +
				'\n---CURL_INFO---\n' +
				'200\n' +
				'0.123\n' +
				'14';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			const response = await responsePromise;

			expect(response).to.have.property('status', 200);
			expect(response).to.have.property('statusText', 'OK');
			expect(response.body).to.include('users');
		});

		it('should execute a POST request with body', async () => {
			const request = createMockRequest({
				method: 'POST',
				url: 'https://api.example.com/users',
				body: {
					type: 'json',
					content: '{"name": "John"}'
				}
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 201 Created\r\n' +
				'Content-Type: application/json\r\n' +
				'\r\n' +
				'{"id": 123}' +
				'\n---CURL_INFO---\n' +
				'201\n' +
				'0.234\n' +
				'12';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			const response = await responsePromise;

			expect(response.status).to.equal(201);
			expect(response.statusText).to.equal('Created');
		});

		it('should execute request with headers', async () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/data',
				headers: [
					{ key: 'Authorization', value: 'Bearer token123', enabled: true },
					{ key: 'X-Custom', value: 'test', enabled: true }
				]
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			// Verify spawn was called with correct arguments
			expect(spawnStub.calledOnce).to.be.true;
			const args = spawnStub.firstCall.args[1] as string[];
			expect(args).to.include('--header');
			expect(args).to.include('Authorization: Bearer token123');
			expect(args).to.include('X-Custom: test');
		});

		it('should execute request with query parameters', async () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/search',
				queryParams: [
					{ key: 'q', value: 'test', enabled: true },
					{ key: 'limit', value: '10', enabled: true }
				]
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n[]' +
				'\n---CURL_INFO---\n200\n0.15\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			expect(spawnStub.calledOnce).to.be.true;
			const url = spawnStub.firstCall.args[1].find((arg: string) =>
				arg.includes('search?')
			);
			expect(url).to.include('q=test');
			expect(url).to.include('limit=10');
		});

		it('should handle basic authentication', async () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/protected',
				auth: createMockAuth('basic')
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			const args = spawnStub.firstCall.args[1] as string[];
			expect(args).to.include('--user');
			expect(args).to.include('testuser:testpass');
		});

		it('should handle bearer token authentication', async () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/protected',
				auth: createMockAuth('bearer')
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			const args = spawnStub.firstCall.args[1] as string[];
			expect(args).to.include('--header');
			expect(args).to.include('Authorization: Bearer test-token-12345');
		});

		it('should handle API key authentication', async () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/protected',
				auth: createMockAuth('api-key')
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			const args = spawnStub.firstCall.args[1] as string[];
			expect(args).to.include('--header');
			expect(args).to.include('X-API-Key: test-api-key-67890');
		});

		it('should pass advanced flags to cURL process', async () => {
			const { createDefaultAdvancedOptions } = await import('../../../types/request');
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/test',
				advanced: {
					...createDefaultAdvancedOptions(),
					httpVersion: 'http2',
					compressed: true,
					proxy: 'http://proxy:8080',
					retry: '3'
				}
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			const args = spawnStub.firstCall.args[1] as string[];
			expect(args).to.include('--http2');
			expect(args).to.include('--compressed');
			expect(args).to.include('--proxy');
			expect(args).to.include('http://proxy:8080');
			expect(args).to.include('--retry');
			expect(args).to.include('3');
		});

		it('should handle request without advanced options (backward compat)', async () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/test'
			});
			// Ensure advanced is undefined
			delete (request as any).advanced;

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			const response = await responsePromise;
			expect(response.status).to.equal(200);
		});

		it('should reject on cURL error (exit code 6 - could not resolve host)', async () => {
			const request = createMockRequest({
				url: 'https://nonexistent.invalid'
			});

			const responsePromise = executor.execute(request);

			mockProcess.stderr.emit('data', Buffer.from('Could not resolve host'));
			mockProcess.emit('close', 6);

			try {
				await responsePromise;
				expect.fail('Should have rejected');
			} catch (error: any) {
				expect(error.message).to.include('Could not resolve host');
				expect(error.message).to.include('(6)');
			}
		});

		it('should reject on cURL error (exit code 7 - failed to connect)', async () => {
			const request = createMockRequest({
				url: 'https://localhost:9999'
			});

			const responsePromise = executor.execute(request);

			mockProcess.stderr.emit('data', Buffer.from('Failed to connect'));
			mockProcess.emit('close', 7);

			try {
				await responsePromise;
				expect.fail('Should have rejected');
			} catch (error: any) {
				expect(error.message).to.include('Failed to connect');
				expect(error.message).to.include('(7)');
			}
		});

		it('should reject on process spawn error', async () => {
			const request = createMockRequest();

			const responsePromise = executor.execute(request);

			mockProcess.emit('error', new Error('ENOENT: cURL not found'));

			try {
				await responsePromise;
				expect.fail('Should have rejected');
			} catch (error: any) {
				expect(error.message).to.include('Failed to execute cURL');
				expect(error.message).to.include('ENOENT');
			}
		});

		it('should handle chunked stdout data', async () => {
			const request = createMockRequest();

			const responsePromise = executor.execute(request);

			// Emit response in chunks
			mockProcess.stdout.emit('data', Buffer.from('HTTP/1.1 200 OK\r\n'));
			mockProcess.stdout.emit('data', Buffer.from('Content-Type: application/json\r\n'));
			mockProcess.stdout.emit('data', Buffer.from('\r\n'));
			mockProcess.stdout.emit('data', Buffer.from('{"status":"ok"}'));
			mockProcess.stdout.emit('data', Buffer.from('\n---CURL_INFO---\n200\n0.1\n15'));
			mockProcess.emit('close', 0);

			const response = await responsePromise;

			expect(response.status).to.equal(200);
			expect(response.body).to.include('status');
		});

		it('should use configuration from VS Code settings', async () => {
			const request = createMockRequest();

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			// Verify VS Code configuration was accessed
			expect(getConfigurationStub.calledWith('curl-code')).to.be.true;
		});
	});

	describe('cancel', () => {
		it('should cancel an in-progress request with RequestCancelledError', async () => {
			const request = createMockRequest();

			const responsePromise = executor.execute(request);

			// Cancel before process completes
			executor.cancel(request.id);

			expect(mockProcess.killed).to.be.true;

			try {
				await responsePromise;
				expect.fail('Should have rejected due to cancellation');
			} catch (error) {
				expect(error).to.be.instanceOf(RequestCancelledError);
				expect((error as Error).message).to.equal('Request cancelled');
			}
		});

		it('should do nothing if no request is in progress', () => {
			expect(() => executor.cancel('nonexistent-id')).to.not.throw();
		});

		it('should not reject twice when cancel is followed by close event', async () => {
			// Disable auto-close so we can manually fire close after cancel
			mockProcess.autoCloseOnKill = false;

			const request = createMockRequest();
			const responsePromise = executor.execute(request);

			executor.cancel(request.id);

			// Manually fire close (simulating the OS delivering the signal)
			mockProcess.emit('close', null);

			try {
				await responsePromise;
				expect.fail('Should have rejected');
			} catch (error) {
				// Should get exactly one rejection — the cancellation
				expect(error).to.be.instanceOf(RequestCancelledError);
			}
		});

		it('should escalate to SIGKILL if SIGTERM does not terminate the process', async () => {
			// Disable auto-close so the process stays alive after SIGTERM
			mockProcess.autoCloseOnKill = false;

			const request = createMockRequest();
			const responsePromise = executor.execute(request);

			// Use fake timers so we can advance past the SIGKILL delay
			const clock = sinon.useFakeTimers({ shouldAdvanceTime: false });
			try {
				executor.cancel(request.id);

				expect(mockProcess.killSignals).to.include('SIGTERM');
				expect(mockProcess.killSignals).to.not.include('SIGKILL');

				// Advance past SIGKILL_DELAY_MS (3 000 ms)
				clock.tick(3100);

				expect(mockProcess.killSignals).to.include('SIGKILL');
			} finally {
				clock.restore();
			}

			// Let the promise settle — emit close so tests don't hang
			mockProcess.emit('close', null);
			try { await responsePromise; } catch { /* expected */ }
		});
	});

	describe('timeout handling', () => {
		it('should reject with timeout error when request exceeds timeout', async () => {
			mockProcess.autoCloseOnKill = false;

			const request = createMockRequest();

			const clock = sinon.useFakeTimers({ shouldAdvanceTime: false });
			try {
				const responsePromise = executor.execute(request);

				// Advance past timeout (30 000 ms default + 1 000 ms buffer)
				clock.tick(31100);

				// The process should have been killed
				expect(mockProcess.killed).to.be.true;
				expect(mockProcess.killSignals).to.include('SIGTERM');

				// Let close fire so the promise settles
				mockProcess.emit('close', null);

				try {
					await responsePromise;
					expect.fail('Should have rejected');
				} catch (error: any) {
					expect(error.message).to.include('timed out');
					// Should NOT be a RequestCancelledError
					expect(error).to.not.be.instanceOf(RequestCancelledError);
				}
			} finally {
				clock.restore();
			}
		});

		it('should escalate timeout kill to SIGKILL', async () => {
			mockProcess.autoCloseOnKill = false;

			const request = createMockRequest();

			const clock = sinon.useFakeTimers({ shouldAdvanceTime: false });
			try {
				const responsePromise = executor.execute(request);

				// Trigger the timeout
				clock.tick(31100);
				expect(mockProcess.killSignals).to.include('SIGTERM');
				expect(mockProcess.killSignals).to.not.include('SIGKILL');

				// Advance past SIGKILL delay
				clock.tick(3100);
				expect(mockProcess.killSignals).to.include('SIGKILL');

				mockProcess.emit('close', null);
				try { await responsePromise; } catch { /* expected */ }
			} finally {
				clock.restore();
			}
		});

		it('should clear timeout when request completes normally', async () => {
			const request = createMockRequest();
			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			const response = await responsePromise;
			expect(response.status).to.equal(200);
			// If the timeout wasn't cleared this would cause issues in subsequent tests
		});
	});

	describe('connect-timeout', () => {
		it('should pass --connect-timeout by default', async () => {
			const request = createMockRequest();

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			const args = spawnStub.firstCall.args[1] as string[];
			const ctIdx = args.indexOf('--connect-timeout');
			expect(ctIdx).to.be.greaterThan(-1);
			expect(args[ctIdx + 1]).to.equal('10');
		});

		it('should not add default --connect-timeout when advanced option is set', async () => {
			const { createDefaultAdvancedOptions } = await import('../../../types/request');
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					connectTimeout: '5',
				}
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			const args = spawnStub.firstCall.args[1] as string[];
			// Should only have ONE --connect-timeout (from advanced, not the default)
			const ctIndices = args.reduce<number[]>((acc, arg, i) => {
				if (arg === '--connect-timeout') acc.push(i);
				return acc;
			}, []);
			expect(ctIndices).to.have.length(1);
			expect(args[ctIndices[0] + 1]).to.equal('5');
		});
	});

	describe('checkCurlAvailable', () => {
		it('should return true when cURL is available', async () => {
			const mockVersionProcess = new MockChildProcess();
			spawnStub.returns(mockVersionProcess as any);

			const availablePromise = executor.checkCurlAvailable();

			mockVersionProcess.emit('close', 0);

			const available = await availablePromise;
			expect(available).to.be.true;
			expect(spawnStub.calledWith('curl', ['--version'])).to.be.true;
		});

		it('should return false when cURL is not found', async () => {
			const mockVersionProcess = new MockChildProcess();
			spawnStub.returns(mockVersionProcess as any);

			const availablePromise = executor.checkCurlAvailable();

			mockVersionProcess.emit('error', new Error('ENOENT'));

			const available = await availablePromise;
			expect(available).to.be.false;
		});
	});

	describe('buildCurlCommand', () => {
		it('should build command for GET request', () => {
			const request = createMockRequest({
				method: 'GET',
				url: 'https://api.example.com/users'
			});

			const command = executor.buildCurlCommand(request);

			expect(command).to.include('curl');
			expect(command).to.include('--request GET');
			expect(command).to.include('https://api.example.com/users');
		});

		it('should build command for POST request with body', () => {
			const request = createMockRequest({
				method: 'POST',
				url: 'https://api.example.com/users',
				body: {
					type: 'json',
					content: '{"name":"John"}'
				}
			});

			const command = executor.buildCurlCommand(request);

			expect(command).to.include('curl');
			expect(command).to.include('--request POST');
			expect(command).to.include('--data');
			expect(command).to.include('{"name":"John"}');
		});

		it('should build command with headers', () => {
			const request = createMockRequest({
				headers: [
					{ key: 'Content-Type', value: 'application/json', enabled: true }
				]
			});

			const command = executor.buildCurlCommand(request);

			expect(command).to.include('--header');
			expect(command).to.include('Content-Type: application/json');
		});
	});

	describe('environment variable interpolation', () => {
		it('should work without environment service', async () => {
			const request = createMockRequest({
				url: 'https://{{host}}/api'
			});

			const responsePromise = executor.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			mockProcess.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess.emit('close', 0);

			await responsePromise;

			// URL should remain unchanged without environment service
			const args = spawnStub.firstCall.args[1] as string[];
			const url = args.find(arg => arg.includes('{{host}}'));
			expect(url).to.exist;
		});

		it('should interpolate advanced fields with environment service', async () => {
			const mockEnvService = {
				resolveVariables: sinon.stub()
			};
			mockEnvService.resolveVariables
				.withArgs('{{proxy_url}}')
				.returns('http://proxy.corp:8080');
			mockEnvService.resolveVariables.callsFake((val: string) => val);

			const executorWithEnv = new CurlExecutor(mockEnvService as any);

			const { createDefaultAdvancedOptions } = await import('../../../types/request');
			const request = createMockRequest({
				advanced: {
					...createDefaultAdvancedOptions(),
					proxy: '{{proxy_url}}',
				}
			});

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			const mockProcess2 = new MockChildProcess();
			spawnStub.returns(mockProcess2 as any);

			const responsePromise = executorWithEnv.execute(request);

			mockProcess2.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess2.emit('close', 0);

			await responsePromise;

			const args = spawnStub.firstCall.args[1] as string[];
			expect(args).to.include('--proxy');
			expect(args).to.include('http://proxy.corp:8080');
		});

		it('should interpolate with environment service', async () => {
			const mockEnvService = {
				resolveVariables: sinon.stub()
			};
			mockEnvService.resolveVariables
				.withArgs('https://{{host}}/api')
				.returns('https://api.example.com/api');
			mockEnvService.resolveVariables.callsFake((val: string) => val);

			const executorWithEnv = new CurlExecutor(mockEnvService as any);

			const request = createMockRequest({
				url: 'https://{{host}}/api'
			});

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			// Configure stub before execute() so the right process is returned
			const mockProcess2 = new MockChildProcess();
			spawnStub.returns(mockProcess2 as any);

			const responsePromise = executorWithEnv.execute(request);

			mockProcess2.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess2.emit('close', 0);

			await responsePromise;

			expect(mockEnvService.resolveVariables.called).to.be.true;
		});
	});
});
