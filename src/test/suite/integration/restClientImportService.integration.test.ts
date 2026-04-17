/**
 * Integration tests for RestClientImportService
 * Tests detection and import of REST Client extension environments
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { RestClientImportService } from '../../../services/RestClientImportService';
import { EnvironmentService } from '../../../services/EnvironmentService';
import { MockExtensionContext } from '../../mocks/vscode';

describe('RestClientImportService Integration', () => {
	let service: RestClientImportService;
	let environmentService: EnvironmentService;
	let context: MockExtensionContext;
	let getConfigStub: sinon.SinonStub;

	/** Helper to stub the rest-client.environmentVariables setting */
	function stubRestClientEnvs(envs: Record<string, Record<string, string>> | undefined): void {
		getConfigStub.withArgs('rest-client').returns({
			get: (key: string) => {
				if (key === 'environmentVariables') {
					return envs;
				}
				return undefined;
			}
		});
	}

	beforeEach(async () => {
		context = new MockExtensionContext();
		environmentService = new EnvironmentService(context as any);
		await environmentService.initialize();

		getConfigStub = sinon.stub(vscode.workspace, 'getConfiguration');
		// Default: return normal config for non-rest-client sections
		getConfigStub.callThrough();

		service = new RestClientImportService(context as any, environmentService);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('detectRestClientEnvironments', () => {
		it('should return undefined when no REST Client setting exists', () => {
			stubRestClientEnvs(undefined);
			expect(service.detectRestClientEnvironments()).to.be.undefined;
		});

		it('should return undefined when setting is empty', () => {
			stubRestClientEnvs({});
			expect(service.detectRestClientEnvironments()).to.be.undefined;
		});

		it('should return environments when setting has entries', () => {
			const envs = {
				'$shared': { version: 'v1' },
				'local': { host: 'localhost' },
				'production': { host: 'example.com' }
			};
			stubRestClientEnvs(envs);

			const result = service.detectRestClientEnvironments();
			expect(result).to.deep.equal(envs);
		});

		it('should return environments even if only $shared exists', () => {
			const envs = { '$shared': { version: 'v1' } };
			stubRestClientEnvs(envs);

			const result = service.detectRestClientEnvironments();
			expect(result).to.deep.equal(envs);
		});
	});

	describe('importAll', () => {
		it('should return 0 when no REST Client environments exist', async () => {
			stubRestClientEnvs(undefined);
			const count = await service.importAll();
			expect(count).to.equal(0);
		});

		it('should import named environments', async () => {
			stubRestClientEnvs({
				'local': { host: 'localhost', port: '3000' },
				'production': { host: 'example.com', port: '443' }
			});

			const count = await service.importAll();

			expect(count).to.equal(2);
			const environments = environmentService.getEnvironments();
			expect(environments).to.have.lengthOf(2);
			expect(environments.map(e => e.name)).to.include.members(['local', 'production']);
		});

		it('should merge $shared variables into each environment', async () => {
			stubRestClientEnvs({
				'$shared': { version: 'v1', token: 'shared-token' },
				'local': { host: 'localhost' },
				'production': { host: 'example.com' }
			});

			await service.importAll();

			const environments = environmentService.getEnvironments();
			const local = environments.find(e => e.name === 'local')!;
			const production = environments.find(e => e.name === 'production')!;

			// Both should have the shared variables
			expect(local.variables.find(v => v.key === 'version')?.value).to.equal('v1');
			expect(local.variables.find(v => v.key === 'token')?.value).to.equal('shared-token');
			expect(local.variables.find(v => v.key === 'host')?.value).to.equal('localhost');

			expect(production.variables.find(v => v.key === 'version')?.value).to.equal('v1');
			expect(production.variables.find(v => v.key === 'token')?.value).to.equal('shared-token');
			expect(production.variables.find(v => v.key === 'host')?.value).to.equal('example.com');
		});

		it('should let environment-specific variables override $shared', async () => {
			stubRestClientEnvs({
				'$shared': { host: 'shared.example.com', version: 'v1' },
				'local': { host: 'localhost' }
			});

			await service.importAll();

			const local = environmentService.getEnvironments().find(e => e.name === 'local')!;
			expect(local.variables.find(v => v.key === 'host')?.value).to.equal('localhost');
			expect(local.variables.find(v => v.key === 'version')?.value).to.equal('v1');
		});

		it('should not import $shared as its own environment', async () => {
			stubRestClientEnvs({
				'$shared': { version: 'v1' },
				'local': { host: 'localhost' }
			});

			await service.importAll();

			const environments = environmentService.getEnvironments();
			expect(environments).to.have.lengthOf(1);
			expect(environments[0].name).to.equal('local');
		});

		it('should skip already-imported environment names', async () => {
			stubRestClientEnvs({
				'local': { host: 'localhost' },
				'production': { host: 'example.com' }
			});

			// First import
			await service.importAll();
			expect(environmentService.getEnvironments()).to.have.lengthOf(2);

			// Second import should skip both
			const count = await service.importAll();
			expect(count).to.equal(0);
			// No duplicates created
			expect(environmentService.getEnvironments()).to.have.lengthOf(2);
		});

		it('should import new environments added after first import', async () => {
			stubRestClientEnvs({
				'local': { host: 'localhost' }
			});

			await service.importAll();
			expect(environmentService.getEnvironments()).to.have.lengthOf(1);

			// User adds a new environment in REST Client settings
			stubRestClientEnvs({
				'local': { host: 'localhost' },
				'staging': { host: 'staging.example.com' }
			});

			const count = await service.importAll();
			expect(count).to.equal(1);
			expect(environmentService.getEnvironments()).to.have.lengthOf(2);
			expect(environmentService.getEnvironments().map(e => e.name)).to.include('staging');
		});

		it('should set all variables as default type and enabled', async () => {
			stubRestClientEnvs({
				'local': { host: 'localhost', apiKey: 'secret123' }
			});

			await service.importAll();

			const local = environmentService.getEnvironments().find(e => e.name === 'local')!;
			for (const variable of local.variables) {
				expect(variable.type).to.equal('default');
				expect(variable.enabled).to.be.true;
			}
		});

		it('should show info message on successful import', async () => {
			stubRestClientEnvs({ 'local': { host: 'localhost' } });
			const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage').resolves(undefined as any);

			await service.importAll();

			expect(showInfoStub.calledOnce).to.be.true;
			expect(showInfoStub.firstCall.args[0]).to.include('1 environment(s)');
		});
	});

	describe('importSelected', () => {
		it('should only import the specified environments', async () => {
			stubRestClientEnvs({
				'$shared': { version: 'v1' },
				'local': { host: 'localhost' },
				'staging': { host: 'staging.example.com' },
				'production': { host: 'example.com' }
			});

			const count = await service.importSelected(['local', 'production']);

			expect(count).to.equal(2);
			const names = environmentService.getEnvironments().map(e => e.name);
			expect(names).to.include.members(['local', 'production']);
			expect(names).to.not.include('staging');
		});

		it('should merge $shared into selected environments', async () => {
			stubRestClientEnvs({
				'$shared': { version: 'v1' },
				'local': { host: 'localhost' }
			});

			await service.importSelected(['local']);

			const local = environmentService.getEnvironments().find(e => e.name === 'local')!;
			expect(local.variables.find(v => v.key === 'version')?.value).to.equal('v1');
		});

		it('should skip names that do not exist in REST Client config', async () => {
			stubRestClientEnvs({
				'local': { host: 'localhost' }
			});

			const count = await service.importSelected(['local', 'nonexistent']);

			expect(count).to.equal(1);
			expect(environmentService.getEnvironments()).to.have.lengthOf(1);
		});
	});

	describe('checkAndPromptOnActivation', () => {
		it('should not prompt when dismissed', async () => {
			await context.globalState.update('curl-code.restClientImportDismissed', true);
			stubRestClientEnvs({ 'local': { host: 'localhost' } });
			const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage');

			await service.checkAndPromptOnActivation();

			expect(showInfoStub.called).to.be.false;
		});

		it('should not prompt when no REST Client environments exist', async () => {
			stubRestClientEnvs(undefined);
			const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage');

			await service.checkAndPromptOnActivation();

			expect(showInfoStub.called).to.be.false;
		});

		it('should not prompt when only $shared exists', async () => {
			stubRestClientEnvs({ '$shared': { version: 'v1' } });
			const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage');

			await service.checkAndPromptOnActivation();

			expect(showInfoStub.called).to.be.false;
		});

		it('should not prompt when all environments already imported', async () => {
			stubRestClientEnvs({ 'local': { host: 'localhost' } });
			await context.globalState.update('curl-code.restClientImportedEnvNames', ['local']);
			const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage');

			await service.checkAndPromptOnActivation();

			expect(showInfoStub.called).to.be.false;
		});

		it('should prompt when new environments are detected', async () => {
			stubRestClientEnvs({
				'local': { host: 'localhost' },
				'production': { host: 'example.com' }
			});
			const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage').resolves('Not Now' as any);

			await service.checkAndPromptOnActivation();

			expect(showInfoStub.calledOnce).to.be.true;
			expect(showInfoStub.firstCall.args[0]).to.include('2 REST Client environment(s)');
		});

		it('should import all when user clicks Import', async () => {
			stubRestClientEnvs({
				'local': { host: 'localhost' }
			});
			const showInfoStub = sinon.stub(vscode.window, 'showInformationMessage');
			// First call: the prompt — return 'Import'
			// Second call: the success message from importAll — return undefined
			showInfoStub.onFirstCall().resolves('Import' as any);
			showInfoStub.onSecondCall().resolves(undefined as any);

			await service.checkAndPromptOnActivation();

			const environments = environmentService.getEnvironments();
			expect(environments).to.have.lengthOf(1);
			expect(environments[0].name).to.equal('local');
		});

		it('should set dismissed flag when user clicks Don\'t Ask Again', async () => {
			stubRestClientEnvs({ 'local': { host: 'localhost' } });
			sinon.stub(vscode.window, 'showInformationMessage').resolves("Don't Ask Again" as any);

			await service.checkAndPromptOnActivation();

			const dismissed = context.globalState.get<boolean>('curl-code.restClientImportDismissed');
			expect(dismissed).to.be.true;
		});

		it('should not import or dismiss on Not Now', async () => {
			stubRestClientEnvs({ 'local': { host: 'localhost' } });
			sinon.stub(vscode.window, 'showInformationMessage').resolves('Not Now' as any);

			await service.checkAndPromptOnActivation();

			expect(environmentService.getEnvironments()).to.have.lengthOf(0);
			expect(context.globalState.get<boolean>('curl-code.restClientImportDismissed')).to.be.undefined;
		});
	});

	describe('resetDismissal', () => {
		it('should clear the dismissed flag', async () => {
			await context.globalState.update('curl-code.restClientImportDismissed', true);

			await service.resetDismissal();

			expect(context.globalState.get<boolean>('curl-code.restClientImportDismissed')).to.be.undefined;
		});
	});
});
