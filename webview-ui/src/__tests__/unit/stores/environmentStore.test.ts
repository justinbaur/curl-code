import { describe, it, expect, beforeEach } from 'vitest';
import { useEnvironmentStore } from '../../../state/environmentStore';
import type { Environment } from '../../../vscode';

describe('environmentStore', () => {
	beforeEach(() => {
		// Reset store before each test
		useEnvironmentStore.getState().setEnvironments([], undefined);
	});

	describe('initial state', () => {
		it('should initialize with empty environments and no active environment', () => {
			const { environments, activeEnvironmentId } = useEnvironmentStore.getState();

			expect(environments).toEqual([]);
			expect(activeEnvironmentId).toBeUndefined();
		});
	});

	describe('setEnvironments', () => {
		it('should set environments without active environment', () => {
			const mockEnvironments: Environment[] = [
				{
					id: 'env-1',
					name: 'Development',
					variables: [
						{ key: 'API_URL', value: 'https://dev.api.example.com', type: 'default', enabled: true }
					],
					isActive: false
				},
				{
					id: 'env-2',
					name: 'Production',
					variables: [
						{ key: 'API_URL', value: 'https://api.example.com', type: 'default', enabled: true }
					],
					isActive: false
				}
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments);

			const { environments, activeEnvironmentId } = useEnvironmentStore.getState();
			expect(environments).toEqual(mockEnvironments);
			expect(activeEnvironmentId).toBeUndefined();
		});

		it('should set environments with active environment ID', () => {
			const mockEnvironments: Environment[] = [
				{
					id: 'env-1',
					name: 'Development',
					variables: [],
					isActive: false
				},
				{
					id: 'env-2',
					name: 'Staging',
					variables: [],
					isActive: true
				}
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-2');

			const { environments, activeEnvironmentId } = useEnvironmentStore.getState();
			expect(environments).toEqual(mockEnvironments);
			expect(activeEnvironmentId).toBe('env-2');
		});

		it('should handle single environment', () => {
			const singleEnv: Environment[] = [
				{
					id: 'env-only',
					name: 'Local',
					variables: [
						{ key: 'PORT', value: '3000', type: 'default', enabled: true }
					],
					isActive: true
				}
			];

			useEnvironmentStore.getState().setEnvironments(singleEnv, 'env-only');

			const { environments } = useEnvironmentStore.getState();
			expect(environments).toHaveLength(1);
			expect(environments[0].name).toBe('Local');
		});

		it('should replace existing environments', () => {
			const firstSet: Environment[] = [
				{ id: 'env-1', name: 'First', variables: [], isActive: false }
			];

			const secondSet: Environment[] = [
				{ id: 'env-2', name: 'Second', variables: [], isActive: false },
				{ id: 'env-3', name: 'Third', variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(firstSet);
			useEnvironmentStore.getState().setEnvironments(secondSet);

			const { environments } = useEnvironmentStore.getState();
			expect(environments).toEqual(secondSet);
		});

		it('should handle environments with multiple variables', () => {
			const envWithVars: Environment[] = [
				{
					id: 'env-vars',
					name: 'Test Environment',
					variables: [
						{ key: 'API_URL', value: 'https://test.api.com', type: 'default', enabled: true },
						{ key: 'API_KEY', value: 'secret123', type: 'secret', enabled: true },
						{ key: 'TIMEOUT', value: '5000', type: 'default', enabled: true },
						{ key: 'DEBUG', value: 'true', type: 'default', enabled: false }
					],
					isActive: true
				}
			];

			useEnvironmentStore.getState().setEnvironments(envWithVars, 'env-vars');

			const { environments } = useEnvironmentStore.getState();
			expect(environments[0].variables).toHaveLength(4);
			expect(environments[0].variables[1].type).toBe('secret');
		});

		it('should handle empty environment list', () => {
			// First set some environments
			useEnvironmentStore.getState().setEnvironments([
				{ id: 'env-1', name: 'Test', variables: [], isActive: false }
			], 'env-1');

			// Then clear them
			useEnvironmentStore.getState().setEnvironments([]);

			const { environments, activeEnvironmentId } = useEnvironmentStore.getState();
			expect(environments).toEqual([]);
			expect(activeEnvironmentId).toBeUndefined();
		});
	});

	describe('getActiveEnvironment', () => {
		it('should return undefined when no environments exist', () => {
			const activeEnv = useEnvironmentStore.getState().getActiveEnvironment();

			expect(activeEnv).toBeUndefined();
		});

		it('should return undefined when no active environment is set', () => {
			const mockEnvironments: Environment[] = [
				{ id: 'env-1', name: 'Dev', variables: [], isActive: false },
				{ id: 'env-2', name: 'Prod', variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments);

			const activeEnv = useEnvironmentStore.getState().getActiveEnvironment();
			expect(activeEnv).toBeUndefined();
		});

		it('should return the active environment when set', () => {
			const mockEnvironments: Environment[] = [
				{
					id: 'env-dev',
					name: 'Development',
					variables: [
						{ key: 'API_URL', value: 'https://dev.api.com', type: 'default', enabled: true }
					],
					isActive: false
				},
				{
					id: 'env-prod',
					name: 'Production',
					variables: [
						{ key: 'API_URL', value: 'https://api.com', type: 'default', enabled: true }
					],
					isActive: true
				}
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-prod');

			const activeEnv = useEnvironmentStore.getState().getActiveEnvironment();
			expect(activeEnv).toBeDefined();
			expect(activeEnv?.id).toBe('env-prod');
			expect(activeEnv?.name).toBe('Production');
		});

		it('should return correct environment when active ID changes', () => {
			const mockEnvironments: Environment[] = [
				{ id: 'env-1', name: 'First', variables: [], isActive: false },
				{ id: 'env-2', name: 'Second', variables: [], isActive: false },
				{ id: 'env-3', name: 'Third', variables: [], isActive: false }
			];

			// Set first as active
			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-1');
			expect(useEnvironmentStore.getState().getActiveEnvironment()?.name).toBe('First');

			// Change to third
			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-3');
			expect(useEnvironmentStore.getState().getActiveEnvironment()?.name).toBe('Third');
		});

		it('should return undefined for non-existent active ID', () => {
			const mockEnvironments: Environment[] = [
				{ id: 'env-1', name: 'Test', variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'non-existent-id');

			const activeEnv = useEnvironmentStore.getState().getActiveEnvironment();
			expect(activeEnv).toBeUndefined();
		});

		it('should return environment with all its variables', () => {
			const mockEnvironments: Environment[] = [
				{
					id: 'env-full',
					name: 'Full Environment',
					variables: [
						{ key: 'VAR_1', value: 'value1', type: 'default', enabled: true },
						{ key: 'VAR_2', value: 'value2', type: 'secret', enabled: true },
						{ key: 'VAR_3', value: 'value3', type: 'default', enabled: false }
					],
					isActive: true
				}
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-full');

			const activeEnv = useEnvironmentStore.getState().getActiveEnvironment();
			expect(activeEnv?.variables).toHaveLength(3);
			expect(activeEnv?.variables[0].key).toBe('VAR_1');
		});
	});

	describe('state transitions', () => {
		it('should handle multiple environment switches', () => {
			const mockEnvironments: Environment[] = [
				{ id: 'env-a', name: 'A', variables: [], isActive: false },
				{ id: 'env-b', name: 'B', variables: [], isActive: false },
				{ id: 'env-c', name: 'C', variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-a');
			expect(useEnvironmentStore.getState().activeEnvironmentId).toBe('env-a');

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-b');
			expect(useEnvironmentStore.getState().activeEnvironmentId).toBe('env-b');

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-c');
			expect(useEnvironmentStore.getState().activeEnvironmentId).toBe('env-c');

			// Deactivate
			useEnvironmentStore.getState().setEnvironments(mockEnvironments, undefined);
			expect(useEnvironmentStore.getState().activeEnvironmentId).toBeUndefined();
		});

		it('should preserve environment data when changing active ID', () => {
			const mockEnvironments: Environment[] = [
				{
					id: 'env-1',
					name: 'Environment 1',
					variables: [{ key: 'TEST', value: 'test1', type: 'default', enabled: true }],
					isActive: false
				},
				{
					id: 'env-2',
					name: 'Environment 2',
					variables: [{ key: 'TEST', value: 'test2', type: 'default', enabled: true }],
					isActive: false
				}
			];

			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-1');

			// Change active environment
			useEnvironmentStore.getState().setEnvironments(mockEnvironments, 'env-2');

			// Both environments should still exist
			const { environments } = useEnvironmentStore.getState();
			expect(environments).toHaveLength(2);
			expect(environments[0].name).toBe('Environment 1');
			expect(environments[1].name).toBe('Environment 2');
		});
	});

	describe('edge cases', () => {
		it('should handle environments with duplicate IDs gracefully', () => {
			const duplicateEnvs: Environment[] = [
				{ id: 'same-id', name: 'First', variables: [], isActive: false },
				{ id: 'same-id', name: 'Second', variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(duplicateEnvs, 'same-id');

			// getActiveEnvironment should return the first match
			const activeEnv = useEnvironmentStore.getState().getActiveEnvironment();
			expect(activeEnv?.name).toBe('First');
		});

		it('should handle very long environment names', () => {
			const longName = 'A'.repeat(1000);
			const envs: Environment[] = [
				{ id: 'long-name', name: longName, variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(envs);

			const { environments } = useEnvironmentStore.getState();
			expect(environments[0].name).toBe(longName);
		});

		it('should handle environments with many variables', () => {
			const manyVars = Array.from({ length: 100 }, (_, i) => ({
				key: `VAR_${i}`,
				value: `value_${i}`,
				type: 'default' as const,
				enabled: true
			}));

			const envs: Environment[] = [
				{ id: 'many-vars', name: 'Many Variables', variables: manyVars, isActive: true }
			];

			useEnvironmentStore.getState().setEnvironments(envs, 'many-vars');

			const activeEnv = useEnvironmentStore.getState().getActiveEnvironment();
			expect(activeEnv?.variables).toHaveLength(100);
		});
	});

	describe('environment references', () => {
		it('should store environments array reference (not a deep clone)', () => {
			const originalEnvs: Environment[] = [
				{ id: 'env-1', name: 'Original', variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(originalEnvs);

			const { environments } = useEnvironmentStore.getState();

			// Zustand stores the reference, not a deep clone
			expect(environments).toBe(originalEnvs);
		});

		it('should correctly replace environments on new setEnvironments', () => {
			const firstSet: Environment[] = [
				{ id: 'env-1', name: 'First', variables: [], isActive: false }
			];

			const secondSet: Environment[] = [
				{ id: 'env-2', name: 'Second', variables: [], isActive: false }
			];

			useEnvironmentStore.getState().setEnvironments(firstSet);
			useEnvironmentStore.getState().setEnvironments(secondSet);

			const { environments } = useEnvironmentStore.getState();
			expect(environments).toBe(secondSet);
			expect(environments[0].name).toBe('Second');
		});
	});
});
