/**
 * Integration tests for EnvironmentService
 * These tests run in VS Code environment where vscode module is available
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { EnvironmentService } from '../../../services/EnvironmentService';
import { MockExtensionContext } from '../../mocks/vscode';
import type { Environment } from '../../../types/collection';

describe('EnvironmentService Integration', () => {
	let service: EnvironmentService;
	let context: MockExtensionContext;

	beforeEach(() => {
		context = new MockExtensionContext();
		service = new EnvironmentService(context as any);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('initialization', () => {
		it('should initialize with empty environments', async () => {
			await service.initialize();

			const environments = service.getEnvironments();
			expect(environments).to.be.an('array').that.is.empty;
		});

		it('should load saved environments', async () => {
			const savedEnvs: Environment[] = [
				{
					id: 'env_1',
					name: 'Production',
					variables: [],
					isActive: false
				}
			];
			context.workspaceState.update('curl-code.environments', savedEnvs);

			await service.initialize();

			const environments = service.getEnvironments();
			expect(environments).to.have.lengthOf(1);
			expect(environments[0].name).to.equal('Production');
		});
	});

	describe('createEnvironment', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should create a new environment', async () => {
			const env = await service.createEnvironment('Development');

			expect(env).to.exist;
			expect(env.name).to.equal('Development');
			expect(env.id).to.be.a('string');
			expect(env.variables).to.be.an('array').that.is.empty;
			expect(env.isActive).to.be.false;
		});

		it('should add environment to list', async () => {
			await service.createEnvironment('Production');
			await service.createEnvironment('Development');

			const environments = service.getEnvironments();
			expect(environments).to.have.lengthOf(2);
		});
	});

	describe('updateEnvironment', () => {
		it('should update environment properties', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Original');

			const updated = await service.updateEnvironment(env.id, {
				name: 'Updated',
				variables: [
					{ key: 'API_KEY', value: 'secret123', type: 'default', enabled: true }
				]
			});

			expect(updated).to.exist;
			expect(updated?.name).to.equal('Updated');
			expect(updated?.variables).to.have.lengthOf(1);
		});

		it('should return undefined for non-existent environment', async () => {
			await service.initialize();

			const updated = await service.updateEnvironment('non-existent', {
				name: 'Test'
			});

			expect(updated).to.be.undefined;
		});
	});

	describe('deleteEnvironment', () => {
		it('should delete environment by ID', async () => {
			await service.initialize();
			const env = await service.createEnvironment('To Delete');

			const deleted = await service.deleteEnvironment(env.id);

			expect(deleted).to.be.true;
			const environments = service.getEnvironments();
			expect(environments).to.have.lengthOf(0);
		});

		it('should deactivate if deleting active environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Production');
			await service.setActiveEnvironment(env.id);

			await service.deleteEnvironment(env.id);

			const active = service.getActiveEnvironment();
			expect(active).to.be.undefined;
		});

		it('should return false for non-existent ID', async () => {
			await service.initialize();

			const deleted = await service.deleteEnvironment('non-existent');

			expect(deleted).to.be.false;
		});
	});

	describe('setActiveEnvironment', () => {
		it('should activate an environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Production');

			await service.setActiveEnvironment(env.id);

			const active = service.getActiveEnvironment();
			expect(active).to.exist;
			expect(active?.id).to.equal(env.id);
			expect(active?.isActive).to.be.true;
		});

		it('should deactivate previous environment', async () => {
			await service.initialize();
			const env1 = await service.createEnvironment('Production');
			const env2 = await service.createEnvironment('Development');

			await service.setActiveEnvironment(env1.id);
			await service.setActiveEnvironment(env2.id);

			const environments = service.getEnvironments();
			expect(environments[0].isActive).to.be.false;
			expect(environments[1].isActive).to.be.true;
		});

		it('should deactivate all when setting to null', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Production');
			await service.setActiveEnvironment(env.id);

			await service.setActiveEnvironment(null);

			const active = service.getActiveEnvironment();
			expect(active).to.be.undefined;
		});
	});

	describe('variable operations', () => {
		it('should add variable to environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Development');

			await service.addVariable(env.id, 'BASE_URL', 'https://api.dev.example.com');

			const updated = service.getEnvironment(env.id);
			expect(updated?.variables).to.have.lengthOf(1);
			expect(updated?.variables[0].key).to.equal('BASE_URL');
			expect(updated?.variables[0].value).to.equal('https://api.dev.example.com');
			expect(updated?.variables[0].enabled).to.be.true;
		});

		it('should update variable in environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Development');
			await service.addVariable(env.id, 'API_KEY', 'old-value');

			await service.updateVariable(env.id, 'API_KEY', {
				value: 'new-value'
			});

			const updated = service.getEnvironment(env.id);
			expect(updated?.variables[0].value).to.equal('new-value');
		});

		it('should delete variable from environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Development');
			await service.addVariable(env.id, 'API_KEY', 'secret');
			await service.addVariable(env.id, 'BASE_URL', 'https://api.example.com');

			await service.deleteVariable(env.id, 'API_KEY');

			const updated = service.getEnvironment(env.id);
			expect(updated?.variables).to.have.lengthOf(1);
			expect(updated?.variables[0].key).to.equal('BASE_URL');
		});
	});

	describe('variable resolution', () => {
		it('should resolve variables from active environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Development');
			await service.addVariable(env.id, 'host', 'api.dev.example.com');
			await service.addVariable(env.id, 'port', '8080');
			await service.setActiveEnvironment(env.id);

			const resolved = service.resolveVariables('https://{{host}}:{{port}}/api');

			expect(resolved).to.equal('https://api.dev.example.com:8080/api');
		});

		it('should leave unresolved variables unchanged', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Development');
			await service.addVariable(env.id, 'host', 'api.example.com');
			await service.setActiveEnvironment(env.id);

			const resolved = service.resolveVariables('https://{{host}}:{{port}}/api');

			expect(resolved).to.equal('https://api.example.com:{{port}}/api');
		});

		it('should not resolve when no active environment', async () => {
			await service.initialize();

			const resolved = service.resolveVariables('https://{{host}}/api');

			expect(resolved).to.equal('https://{{host}}/api');
		});

		it('should not resolve disabled variables', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Development');
			await service.addVariable(env.id, 'host', 'api.example.com');
			await service.updateVariable(env.id, 'host', { enabled: false });
			await service.setActiveEnvironment(env.id);

			const resolved = service.resolveVariables('https://{{host}}/api');

			expect(resolved).to.equal('https://{{host}}/api');
		});
	});

	describe('event emissions', () => {
		it('should emit change event when creating environment', async () => {
			await service.initialize();
			const onChangeSpy = sinon.spy();
			service.onChange(onChangeSpy);

			await service.createEnvironment('Test');

			expect(onChangeSpy.calledOnce).to.be.true;
		});

		it('should emit change event when updating environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Test');
			const onChangeSpy = sinon.spy();
			service.onChange(onChangeSpy);

			await service.updateEnvironment(env.id, { name: 'Updated' });

			expect(onChangeSpy.calledOnce).to.be.true;
		});

		it('should emit change event when deleting environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Test');
			const onChangeSpy = sinon.spy();
			service.onChange(onChangeSpy);

			await service.deleteEnvironment(env.id);

			expect(onChangeSpy.calledOnce).to.be.true;
		});

		it('should emit change event when setting active environment', async () => {
			await service.initialize();
			const env = await service.createEnvironment('Test');
			const onChangeSpy = sinon.spy();
			service.onChange(onChangeSpy);

			await service.setActiveEnvironment(env.id);

			expect(onChangeSpy.calledOnce).to.be.true;
		});
	});
});
