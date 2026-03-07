import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunnerDetailPanel } from '../../../components/Runner/RunnerDetailPanel';
import type { RunRequestResult } from '../../../runner-vscode';

function makeResult(overrides: Partial<RunRequestResult> = {}): RunRequestResult {
	return {
		requestId: 'r1',
		requestName: 'Test Request',
		method: 'GET',
		url: 'https://api.example.com/users',
		status: 'passed',
		statusCode: 200,
		statusText: 'OK',
		responseTime: 150,
		...overrides,
	};
}

const defaultResponse = {
	status: 200,
	statusText: 'OK',
	headers: { 'content-type': 'application/json', 'x-request-id': 'abc123' },
	body: '{"id": 1, "name": "Test"}',
	contentType: 'application/json',
	size: 25,
	time: 150,
	curlCommand: 'curl https://api.example.com/users',
};

const defaultProps = {
	resultIndex: 0,
	persistResponses: true,
	collectionName: 'My Collection',
	folderName: undefined as string | undefined,
};

describe('RunnerDetailPanel', () => {
	it('should render breadcrumb with collection and request name', () => {
		render(<RunnerDetailPanel result={makeResult()} {...defaultProps} />);
		expect(screen.getByText('Test Request')).toBeInTheDocument();
		expect(screen.getByText(/My Collection/)).toBeInTheDocument();
	});

	it('should render breadcrumb with folder name when provided', () => {
		render(<RunnerDetailPanel result={makeResult()} {...defaultProps} folderName="Users" />);
		expect(screen.getByText(/Users/)).toBeInTheDocument();
	});

	it('should render result index', () => {
		render(<RunnerDetailPanel result={makeResult()} {...defaultProps} resultIndex={2} />);
		expect(screen.getByText('3')).toBeInTheDocument();
	});

	it('should render Response, Headers, and Request tabs', () => {
		render(<RunnerDetailPanel result={makeResult()} {...defaultProps} />);
		expect(screen.getByText('Response')).toBeInTheDocument();
		expect(screen.getByText('Headers')).toBeInTheDocument();
		expect(screen.getByText('Request')).toBeInTheDocument();
	});

	it('should show Response tab by default', () => {
		render(<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />);
		// Status bar should be visible in response tab
		expect(screen.getByText('200 OK')).toBeInTheDocument();
	});

	it('should show formatted JSON body in response tab', () => {
		const { container } = render(
			<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />
		);
		const body = container.querySelector('.runner-detail-body');
		expect(body).toBeInTheDocument();
		expect(body?.textContent).toContain('"id"');
		expect(body?.textContent).toContain('"name"');
	});

	it('should show Pretty/Raw selector', () => {
		render(<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />);
		const select = screen.getByRole('combobox');
		expect(select).toBeInTheDocument();
	});

	it('should switch to raw view', () => {
		const { container } = render(
			<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />
		);
		fireEvent.change(screen.getByRole('combobox'), { target: { value: 'raw' } });
		const body = container.querySelector('.runner-detail-body');
		expect(body?.textContent).toContain('{"id": 1, "name": "Test"}');
	});

	it('should show response time and size', () => {
		render(<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />);
		expect(screen.getByText('150ms')).toBeInTheDocument();
		expect(screen.getByText('25 B')).toBeInTheDocument();
	});

	it('should show error for failed requests', () => {
		render(
			<RunnerDetailPanel
				result={makeResult({ status: 'failed', error: 'Connection refused' })}
				{...defaultProps}
			/>
		);
		expect(screen.getByText('Connection refused')).toBeInTheDocument();
	});

	it('should show persist hint when no response and persistResponses is off', () => {
		render(
			<RunnerDetailPanel
				result={makeResult()}
				{...defaultProps}
				persistResponses={false}
			/>
		);
		expect(screen.getByText(/Persist responses/)).toBeInTheDocument();
	});

	it('should switch to Headers tab and show header table', () => {
		render(<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />);
		fireEvent.click(screen.getByText('Headers'));
		expect(screen.getByText('content-type')).toBeInTheDocument();
		expect(screen.getByText('application/json')).toBeInTheDocument();
		expect(screen.getByText('x-request-id')).toBeInTheDocument();
		expect(screen.getByText('abc123')).toBeInTheDocument();
	});

	it('should show hint in Headers tab when no response', () => {
		render(<RunnerDetailPanel result={makeResult()} {...defaultProps} persistResponses={false} />);
		fireEvent.click(screen.getByText('Headers'));
		expect(screen.getByText(/Persist responses/)).toBeInTheDocument();
	});

	it('should switch to Request tab and show URL', () => {
		render(<RunnerDetailPanel result={makeResult()} {...defaultProps} />);
		fireEvent.click(screen.getByText('Request'));
		expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
	});

	it('should show curl command in Request tab when available', () => {
		render(<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />);
		fireEvent.click(screen.getByText('Request'));
		expect(screen.getByText('curl https://api.example.com/users')).toBeInTheDocument();
	});

	it('should show pending message for pending requests', () => {
		render(<RunnerDetailPanel result={makeResult({ status: 'pending' })} {...defaultProps} />);
		expect(screen.getByText('Request not yet executed')).toBeInTheDocument();
	});

	it('should show running message for running requests', () => {
		render(<RunnerDetailPanel result={makeResult({ status: 'running' })} {...defaultProps} />);
		expect(screen.getByText('Request in progress...')).toBeInTheDocument();
	});

	it('should render line numbers in response body', () => {
		const { container } = render(
			<RunnerDetailPanel result={makeResult({ response: defaultResponse })} {...defaultProps} />
		);
		const lineNumbers = container.querySelectorAll('.runner-line-number');
		expect(lineNumbers.length).toBeGreaterThan(0);
	});
});
