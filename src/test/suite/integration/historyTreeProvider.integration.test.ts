/**
 * Integration tests for HistoryTreeProvider
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { HistoryTreeProvider } from '../../../providers/HistoryTreeProvider';
import type { HistoryEntry } from '../../../types/request';
import { createMockRequest, createMockResponse } from '../../utils/testHelpers';

describe('HistoryTreeProvider Integration', () => {
	let provider: HistoryTreeProvider;
	let mockHistoryService: { getHistory: sinon.SinonStub };

	beforeEach(() => {
		mockHistoryService = {
			getHistory: sinon.stub(),
		};
		provider = new HistoryTreeProvider(mockHistoryService as any);
	});

	afterEach(() => {
		sinon.restore();
	});

	function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
		return {
			id: overrides.id ?? 'entry-1',
			request: overrides.request ?? createMockRequest(),
			response: overrides.response,
			error: overrides.error,
			timestamp: overrides.timestamp ?? Date.now() - 5000,
		};
	}

	describe('getTreeItem', () => {
		it('should pass the full HistoryEntry as the command argument', () => {
			const entry = makeEntry({ response: createMockResponse() });
			const item = provider.getTreeItem(entry);

			expect(item.command).to.deep.include({
				command: 'curl-code.openRequestBuilder',
				title: 'Open Request',
			});
			expect(item.command!.arguments).to.deep.equal([entry]);
		});

		it('should include both request and response in the command argument', () => {
			const request = createMockRequest({ method: 'POST', url: 'https://api.example.com/users' });
			const response = createMockResponse({ status: 201, statusText: 'Created' });
			const entry = makeEntry({ request, response });

			const item = provider.getTreeItem(entry);
			const arg = item.command!.arguments![0] as HistoryEntry;

			expect(arg.request).to.equal(request);
			expect(arg.response).to.equal(response);
			expect(arg.timestamp).to.equal(entry.timestamp);
		});

		it('should include the entry even when there is no response', () => {
			const entry = makeEntry(); // no response
			const item = provider.getTreeItem(entry);

			const arg = item.command!.arguments![0] as HistoryEntry;
			expect(arg).to.equal(entry);
			expect(arg.response).to.be.undefined;
		});

		it('should include the entry even when there is an error', () => {
			const entry = makeEntry({ error: 'Connection refused' });
			const item = provider.getTreeItem(entry);

			const arg = item.command!.arguments![0] as HistoryEntry;
			expect(arg).to.equal(entry);
			expect(arg.error).to.equal('Connection refused');
		});

		it('should set contextValue to historyEntry', () => {
			const entry = makeEntry();
			const item = provider.getTreeItem(entry);

			expect(item.contextValue).to.equal('historyEntry');
		});

		it('should build label from method and URL path', () => {
			const request = createMockRequest({ method: 'GET', url: 'https://api.example.com/users/42' });
			const entry = makeEntry({ request });
			const item = provider.getTreeItem(entry);

			expect(item.label).to.equal('GET /users/42');
		});

		it('should fall back to raw URL when URL is invalid', () => {
			const request = createMockRequest({ method: 'POST', url: 'not-a-valid-url' });
			const entry = makeEntry({ request });
			const item = provider.getTreeItem(entry);

			expect(item.label).to.equal('POST not-a-valid-url');
		});

		it('should show status · time in description when response exists', () => {
			const response = createMockResponse({ status: 200, statusText: 'OK' });
			const entry = makeEntry({ response, timestamp: Date.now() - 30000 }); // 30s ago
			const item = provider.getTreeItem(entry);

			expect(item.description).to.match(/^200 · /);
		});

		it('should show Error · time in description when error exists', () => {
			const entry = makeEntry({ error: 'ECONNREFUSED', timestamp: Date.now() - 30000 });
			const item = provider.getTreeItem(entry);

			expect(item.description).to.match(/^Error · /);
		});

		it('should use check icon for 2xx responses', () => {
			const response = createMockResponse({ status: 200 });
			const entry = makeEntry({ response });
			const item = provider.getTreeItem(entry);

			expect((item.iconPath as vscode.ThemeIcon).id).to.equal('check');
		});

		it('should use warning icon for 4xx responses', () => {
			const response = createMockResponse({ status: 404, statusText: 'Not Found' });
			const entry = makeEntry({ response });
			const item = provider.getTreeItem(entry);

			expect((item.iconPath as vscode.ThemeIcon).id).to.equal('warning');
		});

		it('should use error icon for 5xx responses', () => {
			const response = createMockResponse({ status: 500, statusText: 'Internal Server Error' });
			const entry = makeEntry({ response });
			const item = provider.getTreeItem(entry);

			expect((item.iconPath as vscode.ThemeIcon).id).to.equal('error');
		});

		it('should use error icon when entry has error', () => {
			const entry = makeEntry({ error: 'timeout' });
			const item = provider.getTreeItem(entry);

			expect((item.iconPath as vscode.ThemeIcon).id).to.equal('error');
		});

		it('should use circle-outline icon when no response and no error', () => {
			const entry = makeEntry();
			const item = provider.getTreeItem(entry);

			expect((item.iconPath as vscode.ThemeIcon).id).to.equal('circle-outline');
		});
	});

	describe('getChildren', () => {
		it('should return all history entries from the service', async () => {
			const entries = [
				makeEntry({ id: 'e1', timestamp: Date.now() - 1000 }),
				makeEntry({ id: 'e2', timestamp: Date.now() - 2000 }),
				makeEntry({ id: 'e3', timestamp: Date.now() - 3000 }),
			];
			mockHistoryService.getHistory.returns(entries);

			const children = await provider.getChildren();

			expect(children).to.deep.equal(entries);
		});

		it('should return empty array when history is empty', async () => {
			mockHistoryService.getHistory.returns([]);

			const children = await provider.getChildren();

			expect(children).to.be.an('array').that.is.empty;
		});

		it('should return empty array for any non-root element', async () => {
			const entry = makeEntry();
			const children = await provider.getChildren(entry);

			expect(children).to.be.an('array').that.is.empty;
			expect(mockHistoryService.getHistory.called).to.be.false;
		});
	});

	describe('refresh', () => {
		it('should fire onDidChangeTreeData when refresh is called', (done) => {
			provider.onDidChangeTreeData(() => done());
			provider.refresh();
		});
	});
});
