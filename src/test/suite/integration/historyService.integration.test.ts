/**
 * Integration tests for HistoryService
 * These tests run in VS Code environment where vscode module is available
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { HistoryService } from '../../../services/HistoryService';
import { MockExtensionContext } from '../../mocks/vscode';
import { createMockRequest, createMockResponse } from '../../utils/testHelpers';

describe('HistoryService Integration', () => {
	let service: HistoryService;
	let context: MockExtensionContext;
	let getConfigurationStub: sinon.SinonStub;

	beforeEach(() => {
		context = new MockExtensionContext();

		// Stub VS Code configuration
		const mockConfig = {
			get: sinon.stub()
		};
		mockConfig.get.withArgs('saveRequestHistory', true).returns(true);
		mockConfig.get.withArgs('maxHistoryItems', 50).returns(50);

		getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig as any);

		service = new HistoryService(context as any);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('initialization', () => {
		it('should initialize with empty history', async () => {
			await service.initialize();

			const history = service.getHistory();
			expect(history).to.be.an('array').that.is.empty;
		});

		it('should load saved history', async () => {
			const savedHistory = [
				{
					id: 'entry_1',
					request: createMockRequest(),
					response: createMockResponse(),
					timestamp: Date.now()
				}
			];
			context.workspaceState.update('curl-code.history', savedHistory);

			await service.initialize();

			const history = service.getHistory();
			expect(history).to.have.lengthOf(1);
		});
	});

	describe('addEntry', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should add entry to history', async () => {
			const request = createMockRequest();
			const response = createMockResponse();

			const entry = await service.addEntry(request, response);

			expect(entry).to.exist;
			expect(entry.request).to.deep.equal(request);
			expect(entry.response).to.deep.equal(response);

			const history = service.getHistory();
			expect(history).to.have.lengthOf(1);
		});

		it('should add entry with error', async () => {
			const request = createMockRequest();
			const error = 'Network timeout';

			const entry = await service.addEntry(request, undefined, error);

			expect(entry.error).to.equal(error);
		});

		it('should add entries to beginning of history', async () => {
			const req1 = createMockRequest({ name: 'First' });
			const req2 = createMockRequest({ name: 'Second' });

			await service.addEntry(req1);
			await service.addEntry(req2);

			const history = service.getHistory();
			expect(history[0].request.name).to.equal('Second'); // Most recent first
			expect(history[1].request.name).to.equal('First');
		});

		it('should respect max history items', async () => {
			// Set max to 3
			const mockConfig = {
				get: sinon.stub()
			};
			mockConfig.get.withArgs('saveRequestHistory', true).returns(true);
			mockConfig.get.withArgs('maxHistoryItems', 50).returns(3);
			getConfigurationStub.returns(mockConfig as any);

			// Add 5 entries
			for (let i = 0; i < 5; i++) {
				await service.addEntry(createMockRequest({ name: `Request ${i}` }));
			}

			const history = service.getHistory();
			expect(history).to.have.lengthOf(3); // Should only keep 3
		});

		it('should not save when history is disabled', async () => {
			const mockConfig = {
				get: sinon.stub()
			};
			mockConfig.get.withArgs('saveRequestHistory', true).returns(false);
			mockConfig.get.withArgs('maxHistoryItems', 50).returns(50);
			getConfigurationStub.returns(mockConfig as any);

			const request = createMockRequest();

			const entry = await service.addEntry(request);

			expect(entry).to.exist; // Entry created
			const history = service.getHistory();
			expect(history).to.have.lengthOf(0); // But not saved
		});
	});

	describe('getEntry', () => {
		it('should get entry by ID', async () => {
			await service.initialize();
			const request = createMockRequest();
			const entry = await service.addEntry(request);

			const found = service.getEntry(entry.id);

			expect(found).to.exist;
			expect(found?.id).to.equal(entry.id);
		});

		it('should return undefined for non-existent ID', async () => {
			await service.initialize();

			const found = service.getEntry('non-existent');

			expect(found).to.be.undefined;
		});
	});

	describe('deleteEntry', () => {
		it('should delete entry by ID', async () => {
			await service.initialize();
			const entry = await service.addEntry(createMockRequest());

			const deleted = await service.deleteEntry(entry.id);

			expect(deleted).to.be.true;
			const history = service.getHistory();
			expect(history).to.have.lengthOf(0);
		});

		it('should return false for non-existent ID', async () => {
			await service.initialize();

			const deleted = await service.deleteEntry('non-existent');

			expect(deleted).to.be.false;
		});
	});

	describe('clearHistory', () => {
		it('should clear all history', async () => {
			await service.initialize();
			await service.addEntry(createMockRequest());
			await service.addEntry(createMockRequest());

			await service.clearHistory();

			const history = service.getHistory();
			expect(history).to.have.lengthOf(0);
		});
	});

	describe('event emissions', () => {
		it('should emit change event when adding entry', async () => {
			await service.initialize();
			const onChangeSpy = sinon.spy();
			service.onChange(onChangeSpy);

			await service.addEntry(createMockRequest());

			expect(onChangeSpy.calledOnce).to.be.true;
		});

		it('should emit change event when deleting entry', async () => {
			await service.initialize();
			const entry = await service.addEntry(createMockRequest());
			const onChangeSpy = sinon.spy();
			service.onChange(onChangeSpy);

			await service.deleteEntry(entry.id);

			expect(onChangeSpy.calledOnce).to.be.true;
		});

		it('should emit change event when clearing history', async () => {
			await service.initialize();
			const onChangeSpy = sinon.spy();
			service.onChange(onChangeSpy);

			await service.clearHistory();

			expect(onChangeSpy.calledOnce).to.be.true;
		});
	});
});
