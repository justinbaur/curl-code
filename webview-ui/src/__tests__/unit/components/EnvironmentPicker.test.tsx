import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnvironmentPicker } from '../../../components/common/EnvironmentPicker';
import * as environmentStore from '../../../state/environmentStore';
import * as vscodeModule from '../../../vscode';

// Mock the environment store
vi.mock('../../../state/environmentStore', () => ({
	useEnvironmentStore: vi.fn(),
}));

// Mock vscode
vi.mock('../../../vscode', () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}));

describe('EnvironmentPicker', () => {
	const mockPostMessage = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(vscodeModule.vscode.postMessage as any) = mockPostMessage;
	});

	describe('rendering', () => {
		it('should not render when no environments exist', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [],
				activeEnvironmentId: null,
			} as any);

			const { container } = render(<EnvironmentPicker />);

			expect(container.firstChild).toBeNull();
		});

		it('should render select when environments exist', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByRole('combobox')).toBeInTheDocument();
			expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
		});

		it('should render "No Environment" option', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByRole('option', { name: 'No Environment' })).toBeInTheDocument();
		});

		it('should render all environments as options', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [{ key: 'API_URL', value: 'prod', enabled: true }] },
					{ id: 'env2', name: 'Development', variables: [{ key: 'API_URL', value: 'dev', enabled: true }, { key: 'DEBUG', value: 'true', enabled: true }] },
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByRole('option', { name: 'Production (1 vars)' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Development (2 vars)' })).toBeInTheDocument();
		});

		it('should show correct variable count in options', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Staging', variables: [
						{ key: 'VAR1', value: 'val1', enabled: true },
						{ key: 'VAR2', value: 'val2', enabled: true },
						{ key: 'VAR3', value: 'val3', enabled: true },
					]},
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByRole('option', { name: 'Staging (3 vars)' })).toBeInTheDocument();
		});

		it('should select active environment', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
					{ id: 'env2', name: 'Development', variables: [] },
				],
				activeEnvironmentId: 'env2',
			} as any);

			render(<EnvironmentPicker />);

			const select = screen.getByRole('combobox');
			expect(select).toHaveValue('env2');
		});

		it('should select "No Environment" when no active environment', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			const select = screen.getByRole('combobox');
			expect(select).toHaveValue('');
		});

		it('should render globe icon', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			const { container } = render(<EnvironmentPicker />);

			const icon = container.querySelector('.codicon-globe');
			expect(icon).toBeInTheDocument();
		});
	});

	describe('active environment info', () => {
		it('should show active variable count when environment is active', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [
						{ key: 'VAR1', value: 'val1', enabled: true },
						{ key: 'VAR2', value: 'val2', enabled: true },
						{ key: 'VAR3', value: 'val3', enabled: false },
					]},
				],
				activeEnvironmentId: 'env1',
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByText('2 active variables')).toBeInTheDocument();
		});

		it('should not show active variable count when no environment is active', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [
						{ key: 'VAR1', value: 'val1', enabled: true },
					]},
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.queryByText(/active variables/)).not.toBeInTheDocument();
		});

		it('should not show active variable count when active environment has no variables', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
				],
				activeEnvironmentId: 'env1',
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.queryByText(/active variables/)).not.toBeInTheDocument();
		});

		it('should count only enabled variables', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [
						{ key: 'VAR1', value: 'val1', enabled: true },
						{ key: 'VAR2', value: 'val2', enabled: false },
						{ key: 'VAR3', value: 'val3', enabled: false },
						{ key: 'VAR4', value: 'val4', enabled: true },
						{ key: 'VAR5', value: 'val5', enabled: true },
					]},
				],
				activeEnvironmentId: 'env1',
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByText('3 active variables')).toBeInTheDocument();
		});
	});

	describe('user interactions', () => {
		it('should send message when selecting an environment', async () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
					{ id: 'env2', name: 'Development', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			const user = userEvent.setup();
			render(<EnvironmentPicker />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'env1');

			expect(mockPostMessage).toHaveBeenCalledWith({
				type: 'selectEnvironment',
				environmentId: 'env1',
			});
		});

		it('should send message with null when selecting "No Environment"', async () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
				],
				activeEnvironmentId: 'env1',
			} as any);

			const user = userEvent.setup();
			render(<EnvironmentPicker />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, '');

			expect(mockPostMessage).toHaveBeenCalledWith({
				type: 'selectEnvironment',
				environmentId: null,
			});
		});

		it('should update selection when changing environments', async () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
					{ id: 'env2', name: 'Development', variables: [] },
					{ id: 'env3', name: 'Staging', variables: [] },
				],
				activeEnvironmentId: 'env1',
			} as any);

			const user = userEvent.setup();
			render(<EnvironmentPicker />);

			const select = screen.getByRole('combobox');

			await user.selectOptions(select, 'env2');
			expect(mockPostMessage).toHaveBeenLastCalledWith({
				type: 'selectEnvironment',
				environmentId: 'env2',
			});

			await user.selectOptions(select, 'env3');
			expect(mockPostMessage).toHaveBeenLastCalledWith({
				type: 'selectEnvironment',
				environmentId: 'env3',
			});
		});
	});

	describe('edge cases', () => {
		it('should handle single environment', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			const options = screen.getAllByRole('option');
			expect(options).toHaveLength(2); // "No Environment" + 1 environment
		});

		it('should handle many environments', () => {
			const manyEnvironments = Array.from({ length: 20 }, (_, i) => ({
				id: `env${i}`,
				name: `Environment ${i}`,
				variables: [],
			}));

			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: manyEnvironments,
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			const options = screen.getAllByRole('option');
			expect(options).toHaveLength(21); // "No Environment" + 20 environments
		});

		it('should handle environment with zero variables showing as (0 vars)', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Empty', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByRole('option', { name: 'Empty (0 vars)' })).toBeInTheDocument();
		});

		it('should handle all variables disabled', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Production', variables: [
						{ key: 'VAR1', value: 'val1', enabled: false },
						{ key: 'VAR2', value: 'val2', enabled: false },
					]},
				],
				activeEnvironmentId: 'env1',
			} as any);

			render(<EnvironmentPicker />);

			// Should not show info when no variables are active
			expect(screen.queryByText(/active variables/)).not.toBeInTheDocument();
		});

		it('should handle environment name with special characters', () => {
			vi.mocked(environmentStore.useEnvironmentStore).mockReturnValue({
				environments: [
					{ id: 'env1', name: 'Prod & Dev (Combined)', variables: [] },
				],
				activeEnvironmentId: null,
			} as any);

			render(<EnvironmentPicker />);

			expect(screen.getByRole('option', { name: 'Prod & Dev (Combined) (0 vars)' })).toBeInTheDocument();
		});
	});
});
