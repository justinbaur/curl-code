/**
 * Integration tests for CurlExecutor
 * These tests run in VS Code environment where vscode module is available
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { EventEmitter } from 'events';
import * as childProcess from 'child_process';
import * as vscode from 'vscode';
import { CurlExecutor } from '../../../curl/executor';
import { createMockRequest, createMockAuth } from '../../utils/testHelpers';
import type { EnvironmentService } from '../../../services/EnvironmentService';
import type { CollectionService } from '../../../services/CollectionService';

/**
 * Mock ChildProcess for testing cURL execution
 */
class MockChildProcess extends EventEmitter {
	stdout = new EventEmitter();
	stderr = new EventEmitter();
	stdin = new EventEmitter();
	killed = false;

	kill(_signal?: string): boolean {
		this.killed = true;
		this.emit('close', null);
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
		mockConfig.get.withArgs('timeout', 30000).returns(30000);

		getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

		// Stub child_process.spawn
		mockProcess = new MockChildProcess();
		spawnStub = sinon.stub(childProcess, 'spawn').returns(mockProcess as any);

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
			expect(args).to.include('-H');
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
			expect(args).to.include('-u');
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
			expect(args).to.include('-H');
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
			expect(args).to.include('-H');
			expect(args).to.include('X-API-Key: test-api-key-67890');
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
		it('should cancel an in-progress request', async () => {
			const request = createMockRequest();

			const responsePromise = executor.execute(request);

			// Cancel before process completes
			executor.cancel();

			expect(mockProcess.killed).to.be.true;

			try {
				await responsePromise;
				expect.fail('Should have rejected due to cancellation');
			} catch (error) {
				// Expected to reject
			}
		});

		it('should do nothing if no request is in progress', () => {
			expect(() => executor.cancel()).to.not.throw();
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
			expect(command).to.include('-X GET');
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
			expect(command).to.include('-X POST');
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

			expect(command).to.include('-H');
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

			const responsePromise = executorWithEnv.execute(request);

			const curlOutput =
				'HTTP/1.1 200 OK\r\n\r\n{}' +
				'\n---CURL_INFO---\n200\n0.1\n2';

			// Need to create new mock process for second execution
			const mockProcess2 = new MockChildProcess();
			spawnStub.returns(mockProcess2 as any);

			mockProcess2.stdout.emit('data', Buffer.from(curlOutput));
			mockProcess2.emit('close', 0);

			await responsePromise;

			expect(mockEnvService.resolveVariables.called).to.be.true;
		});
	});
});
