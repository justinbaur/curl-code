import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseLog } from '../../../components/ResponseViewer/ResponseLog';

describe('ResponseLog', () => {
	describe('empty state', () => {
		it('should show empty state when log is undefined', () => {
			render(<ResponseLog log={undefined} />);

			expect(screen.getByText(/no debug output available/i)).toBeInTheDocument();
		});

		it('should show hint about --verbose flag', () => {
			render(<ResponseLog log={undefined} />);

			expect(screen.getByText(/--verbose/)).toBeInTheDocument();
			expect(screen.getByText(/advanced tab/i)).toBeInTheDocument();
		});
	});

	describe('log content', () => {
		it('should render log content in a pre block', () => {
			const log = '* Connected to example.com (127.0.0.1) port 443';
			render(<ResponseLog log={log} />);

			const pre = screen.getByText(/Connected to example.com/).closest('pre');
			expect(pre).toBeInTheDocument();
		});

		it('should render multiline log content', () => {
			const log = '* Connected to example.com\n> GET / HTTP/2\n< HTTP/2 200';
			render(<ResponseLog log={log} />);

			expect(screen.getByText(/Connected to example.com/)).toBeInTheDocument();
			expect(screen.getByText(/GET \/ HTTP\/2/)).toBeInTheDocument();
			expect(screen.getByText(/HTTP\/2 200/)).toBeInTheDocument();
		});

		it('should apply info class to * prefix lines', () => {
			const log = '* Connected to example.com';
			render(<ResponseLog log={log} />);

			const span = screen.getByText(/Connected to example.com/);
			expect(span).toHaveClass('log-line-info');
		});

		it('should apply request class to > prefix lines', () => {
			const log = '> GET / HTTP/2';
			render(<ResponseLog log={log} />);

			const span = screen.getByText(/GET \/ HTTP\/2/);
			expect(span).toHaveClass('log-line-request');
		});

		it('should apply response class to < prefix lines', () => {
			const log = '< HTTP/2 200';
			render(<ResponseLog log={log} />);

			const span = screen.getByText(/HTTP\/2 200/);
			expect(span).toHaveClass('log-line-response');
		});

		it('should apply default class to unprefixed lines', () => {
			const log = 'some other output';
			render(<ResponseLog log={log} />);

			const span = screen.getByText('some other output');
			expect(span).toHaveClass('log-line-default');
		});

		it('should handle mixed line types', () => {
			const log = [
				'* Trying 127.0.0.1:443...',
				'* Connected to example.com',
				'> GET /api/test HTTP/2',
				'> Host: example.com',
				'> Accept: */*',
				'< HTTP/2 200',
				'< content-type: application/json',
			].join('\n');

			render(<ResponseLog log={log} />);

			// Check info lines
			const tryingSpan = screen.getByText(/Trying 127.0.0.1/);
			expect(tryingSpan).toHaveClass('log-line-info');

			// Check request lines
			const hostSpan = screen.getByText(/Host: example.com/);
			expect(hostSpan).toHaveClass('log-line-request');

			// Check response lines
			const contentTypeSpan = screen.getByText(/content-type: application\/json/);
			expect(contentTypeSpan).toHaveClass('log-line-response');
		});

		it('should handle empty string log', () => {
			render(<ResponseLog log="" />);

			// Empty string is falsy, should show empty state
			expect(screen.getByText(/no debug output available/i)).toBeInTheDocument();
		});
	});
});
