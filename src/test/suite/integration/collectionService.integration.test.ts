/**
 * Integration tests for CollectionService
 * These tests run in VS Code environment where vscode module is available
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as path from 'path';
import * as vscode from 'vscode';
import { fsFacade } from '../../../utils/fsWrapper';
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
	let showWarningMessageStub: sinon.SinonStub;

	beforeEach(() => {
		context = new MockExtensionContext();

		showWarningMessageStub = sinon.stub(vscode.window, 'showWarningMessage').resolves({ title: 'Cancel' });

		// Stub fsFacade methods — plain object properties are configurable on all platforms
		fsStub = {
			mkdir: sinon.stub(fsFacade, 'mkdir').resolves(),
			readdir: sinon.stub(fsFacade, 'readdir').resolves([]),
			readFile: sinon.stub(fsFacade, 'readFile').resolves('{}'),
			writeFile: sinon.stub(fsFacade, 'writeFile').resolves(),
			unlink: sinon.stub(fsFacade, 'unlink').resolves()
		};

		service = new CollectionService(context as any);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('storage', () => {
		it('should always use global storage path regardless of workspace', async () => {
			await service.initialize();

			const mkdirCall = fsStub.mkdir.firstCall;
			expect(mkdirCall.args[0]).to.include(context.globalStorageUri.fsPath);
			expect(mkdirCall.args[0]).to.not.include('.curl-code');
		});
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

		it('should load a linked collection from its source file', async () => {
			const sourcePath = '/projects/my-api/collection.json';
			const stub = { id: 'col_abc', sourcePath };
			const sourceCollection: Collection = {
				id: 'col_abc',
				name: 'Linked Collection',
				requests: [],
				folders: [],
				variables: [],
				createdAt: 1000,
				updatedAt: 1000
			};

			fsStub.readdir.resolves(['col_abc.json']);
			fsStub.readFile
				.withArgs(sinon.match(/col_abc\.json/))
				.resolves(JSON.stringify(stub));
			fsStub.readFile
				.withArgs(sourcePath, 'utf-8')
				.resolves(JSON.stringify(sourceCollection));

			await service.initialize();

			const collections = service.getCollections();
			expect(collections).to.have.lengthOf(1);
			expect(collections[0].name).to.equal('Linked Collection');
			expect(collections[0].sourcePath).to.equal(sourcePath);
		});

		it('should show a warning and skip a linked collection whose source file is missing', async () => {
			const stub = { id: 'col_missing', sourcePath: '/gone/collection.json' };

			fsStub.readdir.resolves(['col_missing.json']);
			fsStub.readFile
				.withArgs(sinon.match(/col_missing\.json/))
				.resolves(JSON.stringify(stub));
			fsStub.readFile
				.withArgs('/gone/collection.json', 'utf-8')
				.rejects(new Error('ENOENT'));

			await service.initialize();

			expect(service.getCollections()).to.have.lengthOf(0);
			expect(showWarningMessageStub.calledOnce).to.be.true;
			expect(showWarningMessageStub.firstCall.args[0]).to.include('/gone/collection.json');
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

		it('should delete only the stub for a linked collection, not the source file', async () => {
			const sourcePath = '/projects/api/collection.json';
			const stub = { id: 'col_linked', sourcePath };
			const sourceCollection: Collection = {
				id: 'col_linked',
				name: 'Linked',
				requests: [],
				folders: [],
				variables: [],
				createdAt: 1000,
				updatedAt: 1000
			};

			fsStub.readdir.resolves(['col_linked.json']);
			fsStub.readFile
				.withArgs(sinon.match(/col_linked\.json/))
				.resolves(JSON.stringify(stub));
			fsStub.readFile
				.withArgs(sourcePath, 'utf-8')
				.resolves(JSON.stringify(sourceCollection));

			await service.initialize();
			await service.deleteCollection('col_linked');

			expect(fsStub.unlink.calledOnce).to.be.true;
			const deletedPath: string = fsStub.unlink.firstCall.args[0];
			expect(deletedPath).to.not.equal(sourcePath);
			expect(deletedPath).to.include('col_linked.json');
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

		it('should not include sourcePath in exported JSON', async () => {
			const sourcePath = '/projects/api/collection.json';
			const stub = { id: 'col_linked', sourcePath };
			const sourceCollection: Collection = {
				id: 'col_linked',
				name: 'Linked',
				requests: [],
				folders: [],
				variables: [],
				createdAt: 1000,
				updatedAt: 1000
			};

			fsStub.readdir.resolves(['col_linked.json']);
			fsStub.readFile
				.withArgs(sinon.match(/col_linked\.json/))
				.resolves(JSON.stringify(stub));
			fsStub.readFile
				.withArgs(sourcePath, 'utf-8')
				.resolves(JSON.stringify(sourceCollection));

			await service.initialize();

			const json = await service.exportCollection('col_linked');
			const parsed = JSON.parse(json!);
			expect(parsed).to.not.have.property('sourcePath');
		});

		it('should import collection from JSON with a new ID', async () => {
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
			expect(imported?.sourcePath).to.be.undefined;
		});

		it('should import as a linked collection when sourcePath is provided', async () => {
			const sourcePath = '/projects/api/collection.json';
			const mockCollection: Collection = {
				id: 'original_id',
				name: 'Linked Import',
				requests: [],
				folders: [],
				variables: [],
				createdAt: 1000,
				updatedAt: 1000
			};

			const imported = await service.importCollection(JSON.stringify(mockCollection), sourcePath);

			expect(imported).to.exist;
			expect(imported?.id).to.equal('original_id'); // ID preserved
			expect(imported?.sourcePath).to.equal(sourcePath);

			// Should write a stub (only id + sourcePath) not a full copy
			const writeCall = fsStub.writeFile.firstCall;
			const writtenPath: string = writeCall.args[0];
			const writtenContent = JSON.parse(writeCall.args[1]);
			expect(writtenPath).to.include(path.join(context.globalStorageUri.fsPath, 'collections'));
			expect(writtenContent).to.deep.equal({ id: 'original_id', sourcePath });
		});

		it('should write back to sourcePath when saving a linked collection', async () => {
			const sourcePath = '/projects/api/collection.json';
			const mockCollection: Collection = {
				id: 'original_id',
				name: 'Linked Import',
				requests: [],
				folders: [],
				variables: [],
				createdAt: 1000,
				updatedAt: 1000
			};

			await service.importCollection(JSON.stringify(mockCollection), sourcePath);
			fsStub.writeFile.resetHistory();

			// Trigger a save by adding a request
			await service.saveRequest(createMockRequest({ name: 'New Request' }), 'original_id');

			const writeCall = fsStub.writeFile.firstCall;
			const writtenPath: string = writeCall.args[0];
			const writtenContent = JSON.parse(writeCall.args[1]);
			expect(writtenPath).to.equal(sourcePath);
			expect(writtenContent).to.not.have.property('sourcePath'); // Internal field stripped
			expect(writtenContent.requests).to.have.lengthOf(1);
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

	describe('secret redaction', () => {
		function createCollectionWithSecret(overrides?: Partial<Collection>): Collection {
			return {
				id: 'col_secret_test',
				name: 'Secret Test',
				requests: [],
				folders: [],
				variables: [],
				environments: [{
					id: 'env_1',
					name: 'Production',
					isActive: false,
					variables: [
						{ key: 'BASE_URL', value: 'https://api.example.com', type: 'default', enabled: true },
						{ key: 'API_KEY', value: 'super-secret-key', type: 'secret', enabled: true }
					]
				}],
				createdAt: Date.now(),
				updatedAt: Date.now(),
				...overrides
			};
		}

		it('should redact secret values from JSON written to disk', async () => {
			const collection = createCollectionWithSecret();
			await service.importCollection(JSON.stringify(collection));

			// Find the writeFile call that wrote the full collection (not the first call which may be ensureStorageDir)
			const writeCall = fsStub.writeFile.lastCall;
			const writtenContent = JSON.parse(writeCall.args[1]);
			const env = writtenContent.environments[0];
			const defaultVar = env.variables.find((v: any) => v.key === 'BASE_URL');
			const secretVar = env.variables.find((v: any) => v.key === 'API_KEY');

			expect(defaultVar.value).to.equal('https://api.example.com');
			expect(secretVar.value).to.equal(''); // Redacted
			expect(secretVar.type).to.equal('secret'); // Type preserved
		});

		it('should persist secret values to SecretStorage on save', async () => {
			const collection = createCollectionWithSecret();
			await service.importCollection(JSON.stringify(collection));

			// The secret should be stored in context.secrets
			const storedSecret = await context.secrets.get(
				'curl-code.collection-secret.col_secret_test.env_1.API_KEY'
			);
			expect(storedSecret).to.equal('super-secret-key');
		});

		it('should restore secrets from SecretStorage on load', async () => {
			// Pre-populate SecretStorage with a secret value
			await context.secrets.store(
				'curl-code.collection-secret.col_secret_test.env_1.API_KEY',
				'restored-secret-value'
			);

			// Prepare a redacted collection on disk (secret value is empty)
			const redactedCollection: Collection = {
				id: 'col_secret_test',
				name: 'Secret Test',
				requests: [],
				folders: [],
				variables: [],
				environments: [{
					id: 'env_1',
					name: 'Production',
					isActive: false,
					variables: [
						{ key: 'BASE_URL', value: 'https://api.example.com', type: 'default', enabled: true },
						{ key: 'API_KEY', value: '', type: 'secret', enabled: true }
					]
				}],
				createdAt: 1000,
				updatedAt: 1000
			};

			fsStub.readdir.resolves(['col_secret_test.json']);
			fsStub.readFile.resolves(JSON.stringify(redactedCollection));

			await service.initialize();

			const loaded = service.getCollection('col_secret_test');
			expect(loaded).to.exist;
			const secretVar = loaded!.environments![0].variables.find(v => v.key === 'API_KEY');
			expect(secretVar?.value).to.equal('restored-secret-value');
		});

		it('should redact secrets in exported JSON', async () => {
			const collection = createCollectionWithSecret();
			await service.importCollection(JSON.stringify(collection));

			const exported = await service.exportCollection('col_secret_test');
			expect(exported).to.be.a('string');

			const parsed = JSON.parse(exported!);
			const secretVar = parsed.environments[0].variables.find((v: any) => v.key === 'API_KEY');
			expect(secretVar.value).to.equal('');
		});

		it('should clean up SecretStorage when deleting a collection', async () => {
			const collection = createCollectionWithSecret();
			await service.importCollection(JSON.stringify(collection));

			// Verify secret exists
			const before = await context.secrets.get(
				'curl-code.collection-secret.col_secret_test.env_1.API_KEY'
			);
			expect(before).to.equal('super-secret-key');

			await service.deleteCollection('col_secret_test');

			// Verify secret is gone
			const after = await context.secrets.get(
				'curl-code.collection-secret.col_secret_test.env_1.API_KEY'
			);
			expect(after).to.be.undefined;
		});

		it('should delete a single secret via deleteCollectionSecret', async () => {
			await context.secrets.store(
				'curl-code.collection-secret.col_1.env_1.MY_SECRET',
				'secret-value'
			);

			await service.deleteCollectionSecret('col_1', 'env_1', 'MY_SECRET');

			const result = await context.secrets.get(
				'curl-code.collection-secret.col_1.env_1.MY_SECRET'
			);
			expect(result).to.be.undefined;
		});

		it('should persist plaintext secrets from imported collection', async () => {
			// Import a collection that has a secret with a non-empty value (e.g. from an older export)
			const collectionWithPlaintextSecret = createCollectionWithSecret({
				id: 'col_imported',
				name: 'Imported With Secret'
			});

			await service.importCollection(JSON.stringify(collectionWithPlaintextSecret));

			// The plaintext secret should now be in SecretStorage
			const stored = await context.secrets.get(
				'curl-code.collection-secret.col_imported.env_1.API_KEY'
			);
			expect(stored).to.equal('super-secret-key');
		});

		it('should redact secrets from linked collection source file on save', async () => {
			const sourcePath = '/projects/api/collection.json';
			const collection = createCollectionWithSecret({
				id: 'col_linked_secret',
				name: 'Linked Secret'
			});

			await service.importCollection(JSON.stringify(collection), sourcePath);
			fsStub.writeFile.resetHistory();

			// Trigger a save by adding a request
			await service.saveRequest(
				createMockRequest({ name: 'New Request' }),
				'col_linked_secret'
			);

			// Find the write to the source file
			const writeCall = fsStub.writeFile.getCalls().find(
				(call: sinon.SinonSpyCall) => call.args[0] === sourcePath
			);
			expect(writeCall).to.exist;

			const writtenContent = JSON.parse(writeCall!.args[1]);
			const secretVar = writtenContent.environments[0].variables.find(
				(v: any) => v.key === 'API_KEY'
			);
			expect(secretVar.value).to.equal(''); // Redacted in source file
			expect(secretVar.type).to.equal('secret');
		});
	});
});
