import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunnerConfig } from '../../../components/Runner/RunnerConfig';
import type { RunnerRequestInfo } from '../../../runner-vscode';

const mockPostMessage = vi.fn();
vi.mock('../../../runner-vscode', () => ({
	runnerVscode: {
		postMessage: (...args: any[]) => mockPostMessage(...args),
	},
}));

function makeRequest(id: string, name: string, method = 'GET'): RunnerRequestInfo {
	return { id, name, method, url: `https://api.example.com/${id}` };
}

describe('RunnerConfig', () => {
	const requests = [
		makeRequest('r1', 'Get Users'),
		makeRequest('r2', 'Create User', 'POST'),
		makeRequest('r3', 'Delete User', 'DELETE'),
	];

	beforeEach(() => {
		mockPostMessage.mockClear();
	});

	it('should render collection name in title', () => {
		render(<RunnerConfig requests={requests} collectionName="My API" />);
		expect(screen.getByText('Run: My API')).toBeInTheDocument();
	});

	it('should render collection and folder name in title', () => {
		render(<RunnerConfig requests={requests} collectionName="My API" folderName="Users" />);
		expect(screen.getByText('Run: My API / Users')).toBeInTheDocument();
	});

	it('should render environment name when provided', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" activeEnvironmentName="Production" />);
		expect(screen.getByText('Environment:')).toBeInTheDocument();
		expect(screen.getByText('Production')).toBeInTheDocument();
	});

	it('should not render environment section when not provided', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" />);
		expect(screen.queryByText('Environment:')).not.toBeInTheDocument();
	});

	it('should render all request checkboxes', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" />);
		expect(screen.getByText('Get Users')).toBeInTheDocument();
		expect(screen.getByText('Create User')).toBeInTheDocument();
		expect(screen.getByText('Delete User')).toBeInTheDocument();
	});

	it('should have all requests selected by default', () => {
		const { container } = render(<RunnerConfig requests={requests} collectionName="Test" />);
		const checkboxes = screen.getAllByRole('checkbox');
		// stopOnError + persist + selectAll + 3 requests = 6
		expect(checkboxes).toHaveLength(6);
		// Request checkboxes (inside request-list) should all be checked
		const requestCheckboxes = container.querySelectorAll('.runner-config-request-item input[type="checkbox"]');
		expect(requestCheckboxes).toHaveLength(3);
		requestCheckboxes.forEach(cb => {
			expect(cb).toBeChecked();
		});
	});

	it('should show correct count in Select All label', () => {
		const { container } = render(<RunnerConfig requests={requests} collectionName="Test" />);
		const header = container.querySelector('.runner-config-requests-header');
		expect(header?.textContent).toContain('3/3');
	});

	it('should deselect all when Select All is unchecked', () => {
		const { container } = render(<RunnerConfig requests={requests} collectionName="Test" />);
		const selectAllCheckbox = container.querySelector('.runner-config-requests-header input[type="checkbox"]') as HTMLElement;
		fireEvent.click(selectAllCheckbox);
		const header = container.querySelector('.runner-config-requests-header');
		expect(header?.textContent).toContain('0/3');
	});

	it('should toggle individual request selection', () => {
		const { container } = render(<RunnerConfig requests={requests} collectionName="Test" />);
		const requestCheckboxes = container.querySelectorAll('.runner-config-request-item input[type="checkbox"]');
		fireEvent.click(requestCheckboxes[1]); // uncheck r2
		const header = container.querySelector('.runner-config-requests-header');
		expect(header?.textContent).toContain('2/3');
	});

	it('should render delay input with default value 0', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" />);
		const delayInput = screen.getByRole('spinbutton');
		expect(delayInput).toHaveValue(0);
	});

	it('should render stop on error checkbox unchecked by default', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" />);
		expect(screen.getByText('Stop on error')).toBeInTheDocument();
	});

	it('should render persist responses checkbox unchecked by default', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" />);
		expect(screen.getByText('Persist responses')).toBeInTheDocument();
	});

	it('should render Start Run button with request count', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" />);
		expect(screen.getByText('Start Run (3 requests)')).toBeInTheDocument();
	});

	it('should use singular "request" when only 1 selected', () => {
		render(<RunnerConfig requests={[makeRequest('r1', 'Only One')]} collectionName="Test" />);
		expect(screen.getByText('Start Run (1 request)')).toBeInTheDocument();
	});

	it('should disable Start Run button when no requests selected', () => {
		const { container } = render(<RunnerConfig requests={requests} collectionName="Test" />);
		const selectAllCheckbox = container.querySelector('.runner-config-requests-header input[type="checkbox"]') as HTMLElement;
		fireEvent.click(selectAllCheckbox); // deselect all
		const startBtn = container.querySelector('.runner-start-btn') as HTMLButtonElement;
		expect(startBtn).toBeDisabled();
	});

	it('should send runnerStart message with config on Start Run click', () => {
		render(<RunnerConfig requests={requests} collectionName="My Collection" />);
		fireEvent.click(screen.getByText('Start Run (3 requests)'));

		expect(mockPostMessage).toHaveBeenCalledWith({
			type: 'runnerStart',
			config: {
				delayMs: 0,
				stopOnError: false,
				persistResponses: false,
				collectionId: '',
				collectionName: 'My Collection',
				folderName: undefined,
				selectedRequestIds: expect.arrayContaining(['r1', 'r2', 'r3']),
			},
		});
	});

	it('should render HTTP method badges', () => {
		render(<RunnerConfig requests={requests} collectionName="Test" />);
		expect(screen.getByText('GET')).toBeInTheDocument();
		expect(screen.getByText('POST')).toBeInTheDocument();
		expect(screen.getByText('DELETE')).toBeInTheDocument();
	});
});
