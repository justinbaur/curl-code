import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RunnerProgress } from '../../../components/Runner/RunnerProgress';

describe('RunnerProgress', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should render request count', () => {
		render(
			<RunnerProgress currentIndex={2} totalRequests={5} startTime={Date.now()} onCancel={() => {}} />
		);
		expect(screen.getByText('Running: 2 of 5 requests')).toBeInTheDocument();
	});

	it('should render 0 of N when currentIndex is -1', () => {
		render(
			<RunnerProgress currentIndex={-1} totalRequests={5} startTime={Date.now()} onCancel={() => {}} />
		);
		expect(screen.getByText('Running: 0 of 5 requests')).toBeInTheDocument();
	});

	it('should render Cancel Run button', () => {
		render(
			<RunnerProgress currentIndex={0} totalRequests={3} startTime={Date.now()} onCancel={() => {}} />
		);
		expect(screen.getByText('Cancel Run')).toBeInTheDocument();
	});

	it('should call onCancel when Cancel button is clicked', () => {
		const onCancel = vi.fn();
		render(
			<RunnerProgress currentIndex={0} totalRequests={3} startTime={Date.now()} onCancel={onCancel} />
		);
		fireEvent.click(screen.getByText('Cancel Run'));
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('should render progress bar', () => {
		const { container } = render(
			<RunnerProgress currentIndex={2} totalRequests={4} startTime={Date.now()} onCancel={() => {}} />
		);
		const fill = container.querySelector('.runner-progress-bar-fill');
		expect(fill).toBeInTheDocument();
		expect(fill).toHaveStyle({ width: '50%' });
	});

	it('should update elapsed time', () => {
		const startTime = Date.now();
		render(
			<RunnerProgress currentIndex={0} totalRequests={3} startTime={startTime} onCancel={() => {}} />
		);
		act(() => {
			vi.advanceTimersByTime(2500);
		});
		// Should show elapsed time (2.x seconds)
		expect(screen.getByText(/2\.\ds/)).toBeInTheDocument();
	});
});
