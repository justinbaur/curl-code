import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunnerResultsTable } from '../../../components/Runner/RunnerResultsTable';
import type { RunRequestResult } from '../../../runner-vscode';

function makeResult(overrides: Partial<RunRequestResult> = {}): RunRequestResult {
	return {
		requestId: 'r1',
		requestName: 'Test Request',
		method: 'GET',
		url: 'https://api.example.com',
		status: 'passed',
		statusCode: 200,
		statusText: 'OK',
		responseTime: 150,
		...overrides,
	};
}

const defaultProps = {
	selectedIndex: null as number | null,
	onSelectResult: vi.fn(),
	onViewRequest: vi.fn(),
};

describe('RunnerResultsTable', () => {
	it('should show empty message when no results', () => {
		render(<RunnerResultsTable results={[]} {...defaultProps} />);
		expect(screen.getByText('No results yet')).toBeInTheDocument();
	});

	it('should render result rows with name and URL', () => {
		const results = [
			makeResult({ requestName: 'Get Users', url: 'https://api.example.com/users' }),
			makeResult({ requestId: 'r2', requestName: 'Create User', url: 'https://api.example.com/users', method: 'POST' }),
		];
		render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(screen.getByText('Get Users')).toBeInTheDocument();
		expect(screen.getByText('Create User')).toBeInTheDocument();
	});

	it('should display status code', () => {
		const results = [makeResult({ statusCode: 200 })];
		render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(screen.getByText('200')).toBeInTheDocument();
	});

	it('should display response time', () => {
		const results = [makeResult({ responseTime: 150 })];
		render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(screen.getByText('150ms')).toBeInTheDocument();
	});

	it('should display response time in seconds for slow requests', () => {
		const results = [makeResult({ responseTime: 2500 })];
		render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(screen.getByText('2.50s')).toBeInTheDocument();
	});

	it('should render correct status icons', () => {
		const results = [
			makeResult({ requestId: 'r1', status: 'passed' }),
			makeResult({ requestId: 'r2', status: 'failed' }),
			makeResult({ requestId: 'r3', status: 'skipped' }),
			makeResult({ requestId: 'r4', status: 'pending' }),
		];
		const { container } = render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(container.querySelector('.runner-status-passed')).toBeInTheDocument();
		expect(container.querySelector('.runner-status-failed')).toBeInTheDocument();
		expect(container.querySelector('.runner-status-skipped')).toBeInTheDocument();
		expect(container.querySelector('.runner-status-pending')).toBeInTheDocument();
	});

	it('should call onViewRequest when open button is clicked', () => {
		const onViewRequest = vi.fn();
		const results = [makeResult({ requestId: 'r1' })];
		render(<RunnerResultsTable results={results} {...defaultProps} onViewRequest={onViewRequest} />);
		const openBtn = screen.getByTitle('Open in Builder');
		fireEvent.click(openBtn);
		expect(onViewRequest).toHaveBeenCalledWith('r1');
	});

	it('should render HTTP method badge', () => {
		const results = [makeResult({ method: 'POST' })];
		const { container } = render(<RunnerResultsTable results={results} {...defaultProps} />);
		const methodBadge = container.querySelector('.runner-method-post');
		expect(methodBadge).toBeInTheDocument();
		expect(methodBadge).toHaveTextContent('POST');
	});

	it('should call onSelectResult when a row is clicked', () => {
		const onSelectResult = vi.fn();
		const results = [makeResult({ requestName: 'Click Me' })];
		render(<RunnerResultsTable results={results} {...defaultProps} onSelectResult={onSelectResult} />);
		fireEvent.click(screen.getByText('Click Me'));
		expect(onSelectResult).toHaveBeenCalledWith(0);
	});

	it('should highlight the selected row', () => {
		const results = [
			makeResult({ requestId: 'r1', requestName: 'First' }),
			makeResult({ requestId: 'r2', requestName: 'Second' }),
		];
		const { container } = render(
			<RunnerResultsTable results={results} {...defaultProps} selectedIndex={0} />
		);
		const items = container.querySelectorAll('.runner-result-item');
		expect(items[0]).toHaveClass('selected');
		expect(items[1]).not.toHaveClass('selected');
	});

	it('should apply error class to status codes >= 400', () => {
		const results = [makeResult({ statusCode: 500 })];
		const { container } = render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(container.querySelector('.runner-result-status-code.error')).toBeInTheDocument();
	});

	it('should show URL under request name', () => {
		const results = [makeResult({ url: 'https://api.example.com/users' })];
		render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
	});

	it('should add running class for running requests', () => {
		const results = [makeResult({ status: 'running' })];
		const { container } = render(<RunnerResultsTable results={results} {...defaultProps} />);
		expect(container.querySelector('.runner-result-item.running')).toBeInTheDocument();
	});
});
