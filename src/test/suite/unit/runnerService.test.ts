import { expect } from 'chai';
import * as sinon from 'sinon';
import { RunnerService } from '../../../services/RunnerService';
import type { HttpRequest, HttpResponse } from '../../../types/request';
import type { Collection } from '../../../types/collection';
import type { RunConfig } from '../../../types/runner';
import type { RunnerExtensionToWebviewMessage } from '../../../types/runnerMessages';
import type { CurlExecutor } from '../../../curl/executor';
import type { HistoryService } from '../../../services/HistoryService';

function makeRequest(id: string, name: string): HttpRequest {
	return {
		id,
		name,
		method: 'GET',
		url: `https://api.example.com/${id}`,
		headers: [],
		queryParams: [],
		body: { type: 'none', content: '' },
		auth: { type: 'none' },
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}

function makeResponse(status: number = 200): HttpResponse {
	return {
		status,
		statusText: 'OK',
		headers: {},
		body: '{}',
		contentType: 'application/json',
		size: 2,
		time: 100,
		curlCommand: 'curl ...',
	};
}

function makeCollection(requests: HttpRequest[], folders: Collection['folders'] = []): Collection {
	return {
		id: 'col_1',
		name: 'Test Collection',
		folders,
		requests,
		variables: [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}

function makeConfig(overrides: Partial<RunConfig> = {}): RunConfig {
	return {
		delayMs: 0,
		stopOnError: false,
		persistResponses: false,
		collectionId: 'col_1',
		collectionName: 'Test Collection',
		selectedRequestIds: [],
		...overrides,
	};
}

describe('RunnerService', () => {
	let service: RunnerService;
	let mockExecutor: sinon.SinonStubbedInstance<CurlExecutor>;
	let mockHistory: sinon.SinonStubbedInstance<HistoryService>;

	beforeEach(() => {
		mockExecutor = {
			execute: sinon.stub(),
			cancel: sinon.stub(),
			checkCurlAvailable: sinon.stub(),
			buildCurlCommand: sinon.stub(),
		} as any;

		mockHistory = {
			addEntry: sinon.stub().resolves({
				id: 'entry_1',
				request: {} as any,
				timestamp: Date.now(),
			}),
		} as any;

		service = new RunnerService(mockExecutor as any, mockHistory as any);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('collectRequests()', () => {
		it('should return empty array for empty collection', () => {
			const collection = makeCollection([]);
			const result = service.collectRequests(collection);
			expect(result).to.have.lengthOf(0);
		});

		it('should return flat requests from collection root', () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			const collection = makeCollection([r1, r2]);
			const result = service.collectRequests(collection);
			expect(result).to.have.lengthOf(2);
			expect(result[0].id).to.equal('r1');
			expect(result[1].id).to.equal('r2');
		});

		it('should include requests from nested folders depth-first', () => {
			const r1 = makeRequest('r1', 'Root Request');
			const r2 = makeRequest('r2', 'Folder Request');
			const r3 = makeRequest('r3', 'Subfolder Request');
			const collection = makeCollection([r1], [
				{
					id: 'f1',
					name: 'Folder 1',
					folders: [
						{ id: 'f2', name: 'Subfolder', folders: [], requests: [r3] },
					],
					requests: [r2],
				},
			]);
			const result = service.collectRequests(collection);
			expect(result).to.have.lengthOf(3);
			expect(result[0].id).to.equal('r1');
			expect(result[1].id).to.equal('r2');
			expect(result[2].id).to.equal('r3');
		});

		it('should return only requests from specified folder', () => {
			const r1 = makeRequest('r1', 'Root Request');
			const r2 = makeRequest('r2', 'Folder Request');
			const collection = makeCollection([r1], [
				{ id: 'f1', name: 'Folder 1', folders: [], requests: [r2] },
			]);
			const result = service.collectRequests(collection, 'f1');
			expect(result).to.have.lengthOf(1);
			expect(result[0].id).to.equal('r2');
		});

		it('should return empty array for non-existent folder', () => {
			const collection = makeCollection([makeRequest('r1', 'Request 1')]);
			const result = service.collectRequests(collection, 'nonexistent');
			expect(result).to.have.lengthOf(0);
		});
	});

	describe('startRun()', () => {
		it('should execute all selected requests and fire events in order', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			mockExecutor.execute.resolves(makeResponse());

			const messages: RunnerExtensionToWebviewMessage[] = [];
			const config = makeConfig({ selectedRequestIds: ['r1', 'r2'] });
			const state = await service.startRun(config, [r1, r2], msg => messages.push(msg));

			expect(state.status).to.equal('completed');
			expect(state.requests).to.have.lengthOf(2);
			expect(state.requests[0].status).to.equal('passed');
			expect(state.requests[1].status).to.equal('passed');

			// Check event order
			const types = messages.map(m => m.type);
			expect(types).to.deep.equal([
				'runnerInit',
				'runnerRequestStarted',
				'runnerRequestCompleted',
				'runnerRequestStarted',
				'runnerRequestCompleted',
				'runnerCompleted',
			]);
		});

		it('should mark failed requests correctly', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			mockExecutor.execute.rejects(new Error('Connection refused'));

			const config = makeConfig({ selectedRequestIds: ['r1'] });
			const state = await service.startRun(config, [r1], () => {});

			expect(state.requests[0].status).to.equal('failed');
			expect(state.requests[0].error).to.equal('Connection refused');
		});

		it('should continue on error when stopOnError is false', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			mockExecutor.execute.onFirstCall().rejects(new Error('Fail'));
			mockExecutor.execute.onSecondCall().resolves(makeResponse());

			const config = makeConfig({ stopOnError: false, selectedRequestIds: ['r1', 'r2'] });
			const state = await service.startRun(config, [r1, r2], () => {});

			expect(state.requests[0].status).to.equal('failed');
			expect(state.requests[1].status).to.equal('passed');
			expect(state.summary!.failed).to.equal(1);
			expect(state.summary!.passed).to.equal(1);
		});

		it('should stop on error when stopOnError is true', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			mockExecutor.execute.onFirstCall().rejects(new Error('Fail'));

			const config = makeConfig({ stopOnError: true, selectedRequestIds: ['r1', 'r2'] });
			const state = await service.startRun(config, [r1, r2], () => {});

			expect(state.requests[0].status).to.equal('failed');
			expect(state.requests[1].status).to.equal('skipped');
			expect(state.summary!.skipped).to.equal(1);
			expect(mockExecutor.execute.callCount).to.equal(1);
		});

		it('should filter to selected request IDs only', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			const r3 = makeRequest('r3', 'Request 3');
			mockExecutor.execute.resolves(makeResponse());

			const config = makeConfig({ selectedRequestIds: ['r1', 'r3'] });
			const state = await service.startRun(config, [r1, r2, r3], () => {});

			expect(state.requests).to.have.lengthOf(2);
			expect(state.requests[0].requestId).to.equal('r1');
			expect(state.requests[1].requestId).to.equal('r3');
			expect(mockExecutor.execute.callCount).to.equal(2);
		});

		it('should log each request to history', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			mockExecutor.execute.resolves(makeResponse());

			const config = makeConfig({ selectedRequestIds: ['r1', 'r2'] });
			await service.startRun(config, [r1, r2], () => {});

			expect(mockHistory.addEntry.callCount).to.equal(2);
		});

		it('should include response when persistResponses is true', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const response = makeResponse();
			mockExecutor.execute.resolves(response);

			const config = makeConfig({ persistResponses: true, selectedRequestIds: ['r1'] });
			const state = await service.startRun(config, [r1], () => {});

			expect(state.requests[0].response).to.exist;
			expect(state.requests[0].response!.status).to.equal(200);
		});

		it('should not include response when persistResponses is false', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			mockExecutor.execute.resolves(makeResponse());

			const config = makeConfig({ persistResponses: false, selectedRequestIds: ['r1'] });
			const state = await service.startRun(config, [r1], () => {});

			expect(state.requests[0].response).to.be.undefined;
		});

		it('should compute summary correctly', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			mockExecutor.execute.onFirstCall().resolves(makeResponse());
			mockExecutor.execute.onSecondCall().rejects(new Error('Fail'));

			const config = makeConfig({ selectedRequestIds: ['r1', 'r2'] });
			const state = await service.startRun(config, [r1, r2], () => {});

			expect(state.summary).to.exist;
			expect(state.summary!.total).to.equal(2);
			expect(state.summary!.passed).to.equal(1);
			expect(state.summary!.failed).to.equal(1);
			expect(state.summary!.skipped).to.equal(0);
			expect(state.summary!.totalTime).to.be.at.least(0);
		});

		it('should throw if already running', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			// Make execute hang forever
			mockExecutor.execute.returns(new Promise(() => {}));

			const config = makeConfig({ selectedRequestIds: ['r1'] });
			// Start first run (won't complete)
			service.startRun(config, [r1], () => {});

			try {
				await service.startRun(config, [r1], () => {});
				expect.fail('Should have thrown');
			} catch (err: any) {
				expect(err.message).to.equal('A run is already in progress');
			}
		});
	});

	describe('cancel()', () => {
		it('should be a no-op when not running', () => {
			expect(() => service.cancel()).to.not.throw();
		});

		it('should call executor cancel', async () => {
			const r1 = makeRequest('r1', 'Request 1');
			const r2 = makeRequest('r2', 'Request 2');
			let resolveFirst: (value: HttpResponse) => void;
			mockExecutor.execute.onFirstCall().returns(new Promise(resolve => {
				resolveFirst = resolve;
			}));

			const config = makeConfig({ selectedRequestIds: ['r1', 'r2'] });
			const runPromise = service.startRun(config, [r1, r2], () => {});

			// Cancel while first request is in flight
			service.cancel();
			resolveFirst!(makeResponse());

			const state = await runPromise;
			expect(state.status).to.equal('cancelled');
			expect(mockExecutor.cancel.calledOnce).to.be.true;
		});
	});

	describe('isRunning()', () => {
		it('should return false initially', () => {
			expect(service.isRunning()).to.be.false;
		});
	});
});
