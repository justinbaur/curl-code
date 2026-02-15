/**
 * Integration tests for CollectionService
 * These tests run in VS Code environment where vscode module is available
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { CollectionService } from '../../../services/CollectionService';
import { MockExtensionContext } from '../../mocks/vscode';
import { createMockRequest } from '../../utils/testHelpers';
import type { Collection } from '../../../types/collection';

describe('CollectionService Integration', () => {
	let service: CollectionService;
	let context: MockExtensionContext;
	let fsStub: {
		mkdir: sinon.SinonStub;
		readdir: sinon.SinonStub;
		readFile: sinon.SinonStub;
		writeFile: sinon.SinonStub;
		unlink: sinon.SinonStub;
	};
	let workspaceFoldersStub: sinon.SinonStub;
	let showWarningMessageStub: sinon.SinonStub;

	beforeEach(() => {
		context = new MockExtensionContext();

		// Stub VS Code workspace
		workspaceFoldersStub = sinon.stub(vscode.workspace, 'workspaceFolders').value(undefined);
		showWarningMessageStub = sinon.stub(vscode.window, 'showWarningMessage').resolves({ title: 'Cancel' });

		// Stub fs promises - use replace for macOS compatibility
		fsStub = {
			mkdir: sinon.stub().resolves(),
			readdir: sinon.stub().resolves([]),
			readFile: sinon.stub().resolves('{}'),
			writeFile: sinon.stub().resolves(),
			unlink: sinon.stub().resolves()
		};
		sinon.replace(fs, 'mkdir', fsStub.mkdir);
		sinon.replace(fs, 'readdir', fsStub.readdir);
		sinon.replace(fs, 'readFile', fsStub.readFile);
		sinon.replace(fs, 'writeFile', fsStub.writeFile);
		sinon.replace(fs, 'unlink', fsStub.unlink);

		service = new CollectionService(context as any);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('initialization', () => {
		it('should create storage directory', async () => {
			await service.initialize();

			expect(fsStub.mkdir.calledOnce).to.be.true;
		});

		it('should load existing collections', async () => {
			const mockCollection: Collection = {
				id: 'col_123',
				name: 'Test Collection',
				description: 'Test',
				requests: [],
				folders: [],
				variables: [],
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			fsStub.readdir.resolves(['col_123.json']);
			fsStub.readFile.resolves(JSON.stringify(mockCollection));

			await service.initialize();

			const collections = service.getCollections();
			expect(collections).to.have.lengthOf(1);
			expect(collections[0].name).to.equal('Test Collection');
		});
	});

	describe('collection CRUD', () => {
		it('should create a new collection', async () => {
			const collection = await service.createCollection('My Collection', 'Test description');

			expect(collection).to.exist;
			expect(collection.name).to.equal('My Collection');
			expect(collection.description).to.equal('Test description');
			expect(fsStub.writeFile.calledOnce).to.be.true;
		});

		it('should update a collection', async () => {
			const collection = await service.createCollection('Original');
			fsStub.writeFile.resetHistory();

			const updated = await service.updateCollection(collection.id, {
				name: 'Updated'
			});

			expect(updated?.name).to.equal('Updated');
			expect(fsStub.writeFile.calledOnce).to.be.true;
		});

		it('should delete a collection', async () => {
			const collection = await service.createCollection('To Delete');

			const deleted = await service.deleteCollection(collection.id);

			expect(deleted).to.be.true;
			expect(service.getCollection(collection.id)).to.be.undefined;
			expect(fsStub.unlink.calledOnce).to.be.true;
		});
	});

	describe('folders', () => {
		it('should add folder to collection', async () => {
			const collection = await service.createCollection('Test');

			const folder = await service.addFolder(collection.id, 'New Folder');

			expect(folder).to.exist;
			expect(folder?.name).to.equal('New Folder');
		});

		it('should add nested folder', async () => {
			const collection = await service.createCollection('Test');
			const parent = await service.addFolder(collection.id, 'Parent');

			const child = await service.addFolder(collection.id, 'Child', parent!.id);

			expect(child).to.exist;
			expect(child?.parentId).to.equal(parent!.id);
		});
	});

	describe('requests', () => {
		it('should save request to collection', async () => {
			const collection = await service.createCollection('Test');
			const request = createMockRequest({ name: 'Test Request' });

			await service.saveRequest(request, collection.id);

			const updated = service.getCollection(collection.id);
			expect(updated?.requests).to.have.lengthOf(1);
			expect(updated?.requests[0].name).to.equal('Test Request');
		});

		it('should delete request from collection', async () => {
			const collection = await service.createCollection('Test');
			const request = createMockRequest();
			await service.saveRequest(request, collection.id);

			const deleted = await service.deleteRequest(request.id, collection.id);

			expect(deleted).to.be.true;
			const updated = service.getCollection(collection.id);
			expect(updated?.requests).to.have.lengthOf(0);
		});
	});

	describe('import/export', () => {
		it('should export collection as JSON', async () => {
			const collection = await service.createCollection('Test');

			const json = await service.exportCollection(collection.id);

			expect(json).to.be.a('string');
			const parsed = JSON.parse(json!);
			expect(parsed.name).to.equal('Test');
		});

		it('should import collection from JSON', async () => {
			const mockCollection: Collection = {
				id: 'old_id',
				name: 'Imported',
				requests: [],
				folders: [],
				variables: [],
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			const imported = await service.importCollection(JSON.stringify(mockCollection));

			expect(imported).to.exist;
			expect(imported?.name).to.equal('Imported');
			expect(imported?.id).to.not.equal('old_id'); // New ID generated
		});

		it('should prompt when collection name exists', async () => {
			await service.createCollection('Existing');

			const mockCollection: Collection = {
				id: 'new_id',
				name: 'Existing',
				requests: [],
				folders: [],
				variables: [],
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			const imported = await service.importCollection(JSON.stringify(mockCollection));

			expect(showWarningMessageStub.calledOnce).to.be.true;
			expect(imported).to.be.undefined; // Cancelled
		});
	});
});
