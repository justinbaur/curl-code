import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseInfo } from '../../../components/ResponseViewer/ResponseInfo';
import type { HttpResponse } from '../../../vscode';

describe('ResponseInfo', () => {
	const createMockResponse = (overrides?: Partial<HttpResponse>): HttpResponse => ({
		status: 200,
		statusText: 'OK',
		headers: {},
		body: '',
		contentType: '',
		time: 123,
		size: 1024,
		curlCommand: '',
		...overrides,
	});

	describe('rendering', () => {
		it('should render all info items', () => {
			const response = createMockResponse();
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('Status:')).toBeInTheDocument();
			expect(screen.getByText('Time:')).toBeInTheDocument();
			expect(screen.getByText('Size:')).toBeInTheDocument();
		});

		it('should render status code and text', () => {
			const response = createMockResponse({ status: 200, statusText: 'OK' });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('200 OK')).toBeInTheDocument();
		});

		it('should apply response-info class to container', () => {
			const response = createMockResponse();
			const { container } = render(<ResponseInfo response={response} />);

			expect(container.querySelector('.response-info')).toBeInTheDocument();
		});

		it('should apply response-info-item class to each item', () => {
			const response = createMockResponse();
			const { container } = render(<ResponseInfo response={response} />);

			const items = container.querySelectorAll('.response-info-item');
			expect(items).toHaveLength(3); // Status, Time, Size
		});

		it('should apply response-info-label class to labels', () => {
			const response = createMockResponse();
			const { container } = render(<ResponseInfo response={response} />);

			const labels = container.querySelectorAll('.response-info-label');
			expect(labels).toHaveLength(3);
		});

		it('should apply status-code class to status', () => {
			const response = createMockResponse();
			const { container } = render(<ResponseInfo response={response} />);

			expect(container.querySelector('.status-code')).toBeInTheDocument();
		});
	});

	describe('status class', () => {
		it('should apply success class for 2xx status codes', () => {
			const statuses = [200, 201, 204, 299];

			statuses.forEach((status) => {
				const response = createMockResponse({ status, statusText: 'Success' });
				const { container } = render(<ResponseInfo response={response} />);

				const statusElement = container.querySelector('.status-code');
				expect(statusElement).toHaveClass('success');
			});
		});

		it('should apply redirect class for 3xx status codes', () => {
			const statuses = [301, 302, 304, 307, 308, 399];

			statuses.forEach((status) => {
				const response = createMockResponse({ status, statusText: 'Redirect' });
				const { container } = render(<ResponseInfo response={response} />);

				const statusElement = container.querySelector('.status-code');
				expect(statusElement).toHaveClass('redirect');
			});
		});

		it('should apply client-error class for 4xx status codes', () => {
			const statuses = [400, 401, 403, 404, 422, 429, 499];

			statuses.forEach((status) => {
				const response = createMockResponse({ status, statusText: 'Client Error' });
				const { container } = render(<ResponseInfo response={response} />);

				const statusElement = container.querySelector('.status-code');
				expect(statusElement).toHaveClass('client-error');
			});
		});

		it('should apply server-error class for 5xx status codes', () => {
			const statuses = [500, 502, 503, 504, 599];

			statuses.forEach((status) => {
				const response = createMockResponse({ status, statusText: 'Server Error' });
				const { container } = render(<ResponseInfo response={response} />);

				const statusElement = container.querySelector('.status-code');
				expect(statusElement).toHaveClass('server-error');
			});
		});

		it('should apply server-error class for 1xx status codes', () => {
			const response = createMockResponse({ status: 100, statusText: 'Continue' });
			const { container } = render(<ResponseInfo response={response} />);

			const statusElement = container.querySelector('.status-code');
			expect(statusElement).toHaveClass('server-error');
		});
	});

	describe('status codes', () => {
		it('should display 200 OK', () => {
			const response = createMockResponse({ status: 200, statusText: 'OK' });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('200 OK')).toBeInTheDocument();
		});

		it('should display 201 Created', () => {
			const response = createMockResponse({ status: 201, statusText: 'Created' });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('201 Created')).toBeInTheDocument();
		});

		it('should display 404 Not Found', () => {
			const response = createMockResponse({ status: 404, statusText: 'Not Found' });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('404 Not Found')).toBeInTheDocument();
		});

		it('should display 500 Internal Server Error', () => {
			const response = createMockResponse({
				status: 500,
				statusText: 'Internal Server Error',
			});
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('500 Internal Server Error')).toBeInTheDocument();
		});

		it('should handle custom status text', () => {
			const response = createMockResponse({ status: 200, statusText: 'Custom Status' });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('200 Custom Status')).toBeInTheDocument();
		});
	});

	describe('time formatting', () => {
		it('should format time under 1000ms in milliseconds', () => {
			const times = [0, 1, 50, 123, 500, 999];

			times.forEach((time) => {
				const response = createMockResponse({ time });
				render(<ResponseInfo response={response} />);

				expect(screen.getByText(`${Math.round(time)} ms`)).toBeInTheDocument();
			});
		});

		it('should format time 1000ms and above in seconds', () => {
			const response1 = createMockResponse({ time: 1000 });
			render(<ResponseInfo response={response1} />);
			expect(screen.getByText('1.00 s')).toBeInTheDocument();

			const response2 = createMockResponse({ time: 1500 });
			render(<ResponseInfo response={response2} />);
			expect(screen.getByText('1.50 s')).toBeInTheDocument();

			const response3 = createMockResponse({ time: 5432 });
			render(<ResponseInfo response={response3} />);
			expect(screen.getByText('5.43 s')).toBeInTheDocument();
		});

		it('should round milliseconds to nearest integer', () => {
			const response1 = createMockResponse({ time: 123.4 });
			render(<ResponseInfo response={response1} />);
			expect(screen.getByText('123 ms')).toBeInTheDocument();

			const response2 = createMockResponse({ time: 123.6 });
			render(<ResponseInfo response={response2} />);
			expect(screen.getByText('124 ms')).toBeInTheDocument();
		});

		it('should format seconds to 2 decimal places', () => {
			const response = createMockResponse({ time: 1234.567 });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('1.23 s')).toBeInTheDocument();
		});

		it('should handle very fast responses', () => {
			const response = createMockResponse({ time: 1 });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('1 ms')).toBeInTheDocument();
		});

		it('should handle slow responses', () => {
			const response = createMockResponse({ time: 30000 });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('30.00 s')).toBeInTheDocument();
		});
	});

	describe('size formatting', () => {
		it('should format size under 1024 bytes in bytes', () => {
			const sizes = [0, 1, 100, 512, 1023];

			sizes.forEach((size) => {
				const response = createMockResponse({ size });
				render(<ResponseInfo response={response} />);

				expect(screen.getByText(`${size} B`)).toBeInTheDocument();
			});
		});

		it('should format size under 1MB in kilobytes', () => {
			const response1 = createMockResponse({ size: 1024 });
			render(<ResponseInfo response={response1} />);
			expect(screen.getByText('1.0 KB')).toBeInTheDocument();

			const response2 = createMockResponse({ size: 2048 });
			render(<ResponseInfo response={response2} />);
			expect(screen.getByText('2.0 KB')).toBeInTheDocument();

			const response3 = createMockResponse({ size: 1024 * 500 });
			render(<ResponseInfo response={response3} />);
			expect(screen.getByText('500.0 KB')).toBeInTheDocument();
		});

		it('should format size 1MB and above in megabytes', () => {
			const response1 = createMockResponse({ size: 1024 * 1024 });
			render(<ResponseInfo response={response1} />);
			expect(screen.getByText('1.0 MB')).toBeInTheDocument();

			const response2 = createMockResponse({ size: 1024 * 1024 * 2.5 });
			render(<ResponseInfo response={response2} />);
			expect(screen.getByText('2.5 MB')).toBeInTheDocument();

			const response3 = createMockResponse({ size: 1024 * 1024 * 10 });
			render(<ResponseInfo response={response3} />);
			expect(screen.getByText('10.0 MB')).toBeInTheDocument();
		});

		it('should format KB to 1 decimal place', () => {
			const response = createMockResponse({ size: 1536 }); // 1.5 KB
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('1.5 KB')).toBeInTheDocument();
		});

		it('should format MB to 1 decimal place', () => {
			const response = createMockResponse({ size: 1024 * 1024 * 3.7 }); // 3.7 MB
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('3.7 MB')).toBeInTheDocument();
		});

		it('should handle zero bytes', () => {
			const response = createMockResponse({ size: 0 });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('0 B')).toBeInTheDocument();
		});

		it('should handle very large responses', () => {
			const response = createMockResponse({ size: 1024 * 1024 * 100 }); // 100 MB
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('100.0 MB')).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should handle response with all minimum values', () => {
			const response = createMockResponse({
				status: 100,
				statusText: 'Continue',
				time: 0,
				size: 0,
			});
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('100 Continue')).toBeInTheDocument();
			expect(screen.getByText('0 ms')).toBeInTheDocument();
			expect(screen.getByText('0 B')).toBeInTheDocument();
		});

		it('should handle response with large values', () => {
			const response = createMockResponse({
				status: 599,
				statusText: 'Custom Error',
				time: 60000, // 60 seconds
				size: 1024 * 1024 * 500, // 500 MB
			});
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('599 Custom Error')).toBeInTheDocument();
			expect(screen.getByText('60.00 s')).toBeInTheDocument();
			expect(screen.getByText('500.0 MB')).toBeInTheDocument();
		});

		it('should handle empty status text', () => {
			const response = createMockResponse({ status: 200, statusText: '' });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText(/^200\s*$/)).toBeInTheDocument();
		});

		it('should handle fractional milliseconds', () => {
			const response = createMockResponse({ time: 123.456 });
			render(<ResponseInfo response={response} />);

			expect(screen.getByText('123 ms')).toBeInTheDocument();
		});

		it('should handle fractional bytes', () => {
			const response = createMockResponse({ size: 1536.789 });
			render(<ResponseInfo response={response} />);

			// Should round down to 1.5 KB
			expect(screen.getByText('1.5 KB')).toBeInTheDocument();
		});

		it('should handle boundary values for time formatting', () => {
			const response999 = createMockResponse({ time: 999 });
			render(<ResponseInfo response={response999} />);
			expect(screen.getByText('999 ms')).toBeInTheDocument();

			const response1000 = createMockResponse({ time: 1000 });
			render(<ResponseInfo response={response1000} />);
			expect(screen.getByText('1.00 s')).toBeInTheDocument();
		});

		it('should handle boundary values for size formatting', () => {
			const response1023 = createMockResponse({ size: 1023 });
			render(<ResponseInfo response={response1023} />);
			expect(screen.getByText('1023 B')).toBeInTheDocument();

			const response1024 = createMockResponse({ size: 1024 });
			render(<ResponseInfo response={response1024} />);
			expect(screen.getByText('1.0 KB')).toBeInTheDocument();

			const responseMB = createMockResponse({ size: 1024 * 1024 - 1 });
			render(<ResponseInfo response={responseMB} />);
			expect(screen.getByText('1024.0 KB')).toBeInTheDocument();

			const response1MB = createMockResponse({ size: 1024 * 1024 });
			render(<ResponseInfo response={response1MB} />);
			expect(screen.getByText('1.0 MB')).toBeInTheDocument();
		});
	});
});
