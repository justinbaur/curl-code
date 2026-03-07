import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunnerSummary } from '../../../components/Runner/RunnerSummary';
import type { RunSummary } from '../../../runner-vscode';

function makeSummary(overrides: Partial<RunSummary> = {}): RunSummary {
	return {
		total: 10,
		passed: 8,
		failed: 1,
		skipped: 1,
		totalTime: 5000,
		avgResponseTime: 500,
		...overrides,
	};
}

const defaultProps = {
	collectionName: 'Test Collection',
	folderName: undefined as string | undefined,
	environmentName: undefined as string | undefined,
	activeFilter: 'all' as const,
	onFilterChange: vi.fn(),
	onRunAgain: vi.fn(),
	onNewConfig: vi.fn(),
};

describe('RunnerSummary', () => {
	it('should render collection name in title', () => {
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} />);
		expect(screen.getByText('Test Collection - Run Results')).toBeInTheDocument();
	});

	it('should render collection/folder name in title', () => {
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} folderName="Users" />);
		expect(screen.getByText('Test Collection / Users - Run Results')).toBeInTheDocument();
	});

	it('should render Run Again and New Run buttons', () => {
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} />);
		expect(screen.getByText('Run Again')).toBeInTheDocument();
		expect(screen.getByText('New Run')).toBeInTheDocument();
	});

	it('should call onRunAgain when Run Again is clicked', () => {
		const onRunAgain = vi.fn();
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} onRunAgain={onRunAgain} />);
		fireEvent.click(screen.getByText('Run Again'));
		expect(onRunAgain).toHaveBeenCalledOnce();
	});

	it('should call onNewConfig when New Run is clicked', () => {
		const onNewConfig = vi.fn();
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} onNewConfig={onNewConfig} />);
		fireEvent.click(screen.getByText('New Run'));
		expect(onNewConfig).toHaveBeenCalledOnce();
	});

	it('should render Source metadata', () => {
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} />);
		expect(screen.getByText('Source')).toBeInTheDocument();
		expect(screen.getByText('Runner')).toBeInTheDocument();
	});

	it('should render Environment when provided', () => {
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} environmentName="Production" />);
		expect(screen.getByText('Environment')).toBeInTheDocument();
		expect(screen.getByText('Production')).toBeInTheDocument();
	});

	it('should not render Environment when not provided', () => {
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} />);
		expect(screen.queryByText('Environment')).not.toBeInTheDocument();
	});

	it('should render Duration', () => {
		render(<RunnerSummary summary={makeSummary({ totalTime: 5000 })} {...defaultProps} />);
		expect(screen.getByText('Duration')).toBeInTheDocument();
		expect(screen.getByText('5.00s')).toBeInTheDocument();
	});

	it('should render Duration in ms for fast runs', () => {
		render(<RunnerSummary summary={makeSummary({ totalTime: 350 })} {...defaultProps} />);
		expect(screen.getByText('350ms')).toBeInTheDocument();
	});

	it('should render Avg. Resp. Time', () => {
		render(<RunnerSummary summary={makeSummary({ avgResponseTime: 250 })} {...defaultProps} />);
		expect(screen.getByText('Avg. Resp. Time')).toBeInTheDocument();
		expect(screen.getByText('250ms')).toBeInTheDocument();
	});

	it('should render filter tabs with counts', () => {
		render(<RunnerSummary summary={makeSummary({ passed: 8, failed: 1 })} {...defaultProps} />);
		expect(screen.getByText('All Requests')).toBeInTheDocument();
		expect(screen.getByText('Passed (8)')).toBeInTheDocument();
		expect(screen.getByText('Failed (1)')).toBeInTheDocument();
	});

	it('should render Skipped tab when skipped > 0', () => {
		render(<RunnerSummary summary={makeSummary({ skipped: 2 })} {...defaultProps} />);
		expect(screen.getByText('Skipped (2)')).toBeInTheDocument();
	});

	it('should not render Skipped tab when skipped is 0', () => {
		render(<RunnerSummary summary={makeSummary({ skipped: 0 })} {...defaultProps} />);
		expect(screen.queryByText(/Skipped/)).not.toBeInTheDocument();
	});

	it('should call onFilterChange when a filter tab is clicked', () => {
		const onFilterChange = vi.fn();
		render(<RunnerSummary summary={makeSummary()} {...defaultProps} onFilterChange={onFilterChange} />);
		fireEvent.click(screen.getByText('Passed (8)'));
		expect(onFilterChange).toHaveBeenCalledWith('passed');
	});

	it('should mark active filter tab', () => {
		const { container } = render(
			<RunnerSummary summary={makeSummary()} {...defaultProps} activeFilter="failed" />
		);
		const failedTab = container.querySelector('.runner-filter-failed');
		expect(failedTab).toHaveClass('active');
	});

	it('should format time over 60s as minutes', () => {
		render(<RunnerSummary summary={makeSummary({ totalTime: 125000 })} {...defaultProps} />);
		expect(screen.getByText(/2m 5\.0s/)).toBeInTheDocument();
	});
});
