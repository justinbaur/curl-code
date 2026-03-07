import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RunnerApp } from '../../../RunnerApp';

const mockPostMessage = vi.fn();
let messageCallback: ((message: any) => void) | null = null;

vi.mock('../../../runner-vscode', () => ({
	runnerVscode: {
		postMessage: (...args: any[]) => mockPostMessage(...args),
		onMessage: (cb: (message: any) => void) => {
			messageCallback = cb;
			return () => { messageCallback = null; };
		},
	},
}));

vi.mock('../../../components/Runner/RunnerConfig', () => ({
	RunnerConfig: (props: any) => (
		<div data-testid="runner-config">
			RunnerConfig: {props.collectionName} ({props.requests?.length ?? 0} requests)
		</div>
	),
}));

vi.mock('../../../components/Runner/RunnerProgress', () => ({
	RunnerProgress: (props: any) => (
		<div data-testid="runner-progress">
			Progress: {props.currentIndex}/{props.totalRequests}
		</div>
	),
}));

vi.mock('../../../components/Runner/RunnerResultsTable', () => ({
	RunnerResultsTable: (props: any) => (
		<div data-testid="runner-results">Results: {props.results?.length ?? 0}</div>
	),
}));

vi.mock('../../../components/Runner/RunnerSummary', () => ({
	RunnerSummary: (props: any) => (
		<div data-testid="runner-summary">Summary: {props.summary?.total}</div>
	),
}));

vi.mock('../../../components/Runner/RunnerDetailPanel', () => ({
	RunnerDetailPanel: (props: any) => (
		<div data-testid="runner-detail">Detail: {props.result?.requestName}</div>
	),
}));

function simulateMessage(message: any) {
	act(() => {
		if (messageCallback) {
			messageCallback(message);
		}
	});
}

describe('RunnerApp', () => {
	beforeEach(() => {
		mockPostMessage.mockClear();
		messageCallback = null;
	});

	it('should send runnerReady on mount', () => {
		render(<RunnerApp />);
		expect(mockPostMessage).toHaveBeenCalledWith({ type: 'runnerReady' });
	});

	it('should show config phase initially', () => {
		render(<RunnerApp />);
		expect(screen.getByTestId('runner-config')).toBeInTheDocument();
	});

	it('should show config with requests after runnerLoadRequests', () => {
		render(<RunnerApp />);
		simulateMessage({
			type: 'runnerLoadRequests',
			requests: [
				{ id: 'r1', name: 'Request 1', method: 'GET', url: 'https://example.com' },
				{ id: 'r2', name: 'Request 2', method: 'POST', url: 'https://example.com' },
			],
			collectionName: 'Test Collection',
			activeEnvironmentName: 'Dev',
		});
		expect(screen.getByText(/Test Collection/)).toBeInTheDocument();
		expect(screen.getByText(/2 requests/)).toBeInTheDocument();
	});

	it('should transition to running phase on runnerInit', () => {
		render(<RunnerApp />);
		simulateMessage({
			type: 'runnerInit',
			state: {
				id: 'run_1',
				config: { delayMs: 0, stopOnError: false, persistResponses: false, collectionId: '', collectionName: '', selectedRequestIds: [] },
				status: 'running',
				requests: [
					{ requestId: 'r1', requestName: 'Request 1', method: 'GET', url: 'https://example.com', status: 'pending' },
				],
				currentIndex: -1,
				startTime: Date.now(),
			},
		});
		expect(screen.getByTestId('runner-progress')).toBeInTheDocument();
		expect(screen.getByTestId('runner-results')).toBeInTheDocument();
		expect(screen.queryByTestId('runner-config')).not.toBeInTheDocument();
	});

	it('should transition to completed phase on runnerCompleted', () => {
		render(<RunnerApp />);
		// First go to running
		simulateMessage({
			type: 'runnerInit',
			state: {
				id: 'run_1',
				config: { delayMs: 0, stopOnError: false, persistResponses: false, collectionId: '', collectionName: '', selectedRequestIds: [] },
				status: 'running',
				requests: [],
				currentIndex: -1,
				startTime: Date.now(),
			},
		});
		// Then complete
		simulateMessage({
			type: 'runnerCompleted',
			summary: { total: 3, passed: 2, failed: 1, skipped: 0, totalTime: 1000, avgResponseTime: 333 },
			endTime: Date.now(),
		});
		expect(screen.getByTestId('runner-summary')).toBeInTheDocument();
		expect(screen.queryByTestId('runner-progress')).not.toBeInTheDocument();
		expect(screen.getByTestId('runner-results')).toBeInTheDocument();
	});

	it('should hide config after runnerInit', () => {
		render(<RunnerApp />);
		simulateMessage({
			type: 'runnerInit',
			state: {
				id: 'run_1',
				config: { delayMs: 0, stopOnError: false, persistResponses: false, collectionId: '', collectionName: '', selectedRequestIds: [] },
				status: 'running',
				requests: [],
				currentIndex: -1,
				startTime: Date.now(),
			},
		});
		expect(screen.queryByTestId('runner-config')).not.toBeInTheDocument();
	});
});
