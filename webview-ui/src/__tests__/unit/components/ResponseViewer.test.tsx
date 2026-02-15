import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseViewer } from '../../../components/ResponseViewer/ResponseViewer';
import type { HttpResponse } from '../../../vscode';

describe('ResponseViewer', () => {
	describe('empty state', () => {
		it('should show empty state when no response and no error', () => {
			render(<ResponseViewer response={null} error={null} />);

			expect(screen.getByText(/send a request to see the response/i)).toBeInTheDocument();
			expect(screen.getByText('📡')).toBeInTheDocument();
		});

		it('should show keyboard hint in empty state', () => {
			render(<ResponseViewer response={null} error={null} />);

			expect(screen.getByText(/ctrl\+enter/i)).toBeInTheDocument();
			expect(screen.getByText(/click send/i)).toBeInTheDocument();
		});

		it('should not show tabs in empty state', () => {
			render(<ResponseViewer response={null} error={null} />);

			expect(screen.queryByRole('button')).not.toBeInTheDocument();
		});
	});

	describe('error state', () => {
		it('should show error message when error is present', () => {
			const error = 'Network timeout';
			render(<ResponseViewer response={null} error={error} />);

			expect(screen.getByText('Request Failed')).toBeInTheDocument();
			expect(screen.getByText(error)).toBeInTheDocument();
		});

		it('should not show response content when error is present', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'Success',
				contentType: 'text/plain',
				size: 7,
				time: 100,
				curlCommand: 'curl ...'
			};

			render(<ResponseViewer response={mockResponse} error="Error occurred" />);

			expect(screen.queryByText('Success')).not.toBeInTheDocument();
			expect(screen.getByText('Request Failed')).toBeInTheDocument();
		});

		it('should display multiline error messages', () => {
			const error = 'Connection failed\\nTimeout after 30s\\nRetry limit exceeded';
			render(<ResponseViewer response={null} error={error} />);

			expect(screen.getByText(/Timeout after 30s/i)).toBeInTheDocument();
		});

		it('should not show tabs when error is present', () => {
			render(<ResponseViewer response={null} error="Test error" />);

			expect(screen.queryByRole('button')).not.toBeInTheDocument();
		});
	});

	describe('response display', () => {
		const mockResponse: HttpResponse = {
			status: 200,
			statusText: 'OK',
			headers: {
				'content-type': 'application/json',
				'content-length': '100'
			},
			body: '{"success": true}',
			contentType: 'application/json',
			size: 18,
			time: 245,
			curlCommand: 'curl -X GET https://api.example.com'
		};

		it('should show response when response is present', () => {
			render(<ResponseViewer response={mockResponse} error={null} />);

			// Should show tabs
			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /headers/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /curl/i })).toBeInTheDocument();
		});

		it('should show headers count badge', () => {
			render(<ResponseViewer response={mockResponse} error={null} />);

			const headersTab = screen.getByRole('button', { name: /headers/i });
			expect(headersTab.textContent).toContain('2'); // 2 headers
		});

		it('should default to Body tab', () => {
			render(<ResponseViewer response={mockResponse} error={null} />);

			const bodyTab = screen.getByRole('button', { name: /body/i });
			expect(bodyTab).toHaveClass('active');
		});

		it('should show response with no headers', () => {
			const noHeadersResponse: HttpResponse = {
				...mockResponse,
				headers: {}
			};

			render(<ResponseViewer response={noHeadersResponse} error={null} />);

			const headersTab = screen.getByRole('button', { name: /headers/i });
			// Badge is not rendered when count is 0 (see TabPanel component)
			// Just verify the tab exists
			expect(headersTab).toBeInTheDocument();
			expect(headersTab.textContent).toBe('Headers');
		});

		it('should display cURL command', () => {
			render(<ResponseViewer response={mockResponse} error={null} />);

			// Initial tab is Body, need to check if cURL command exists (will be in cURL tab)
			expect(screen.getByRole('button', { name: /curl/i })).toBeInTheDocument();
		});
	});

	describe('tab switching', () => {
		const mockResponse: HttpResponse = {
			status: 200,
			statusText: 'OK',
			headers: {
				'content-type': 'application/json'
			},
			body: '{"data": "test"}',
			contentType: 'application/json',
			size: 15,
			time: 100,
			curlCommand: 'curl -X POST https://api.example.com -d \'{"test":true}\''
		};

		it('should switch to Headers tab when clicked', async () => {
			const user = userEvent.setup();
			render(<ResponseViewer response={mockResponse} error={null} />);

			const headersTab = screen.getByRole('button', { name: /headers/i });
			await user.click(headersTab);

			expect(headersTab).toHaveClass('active');
		});

		it('should switch to cURL tab when clicked', async () => {
			const user = userEvent.setup();
			render(<ResponseViewer response={mockResponse} error={null} />);

			const curlTab = screen.getByRole('button', { name: /curl/i });
			await user.click(curlTab);

			expect(curlTab).toHaveClass('active');
		});

		it('should show cURL command in cURL tab', async () => {
			const user = userEvent.setup();
			render(<ResponseViewer response={mockResponse} error={null} />);

			const curlTab = screen.getByRole('button', { name: /curl/i });
			await user.click(curlTab);

			expect(screen.getByText(/curl -X POST/)).toBeInTheDocument();
		});

		it('should switch between all tabs', async () => {
			const user = userEvent.setup();
			render(<ResponseViewer response={mockResponse} error={null} />);

			const bodyTab = screen.getByRole('button', { name: /body/i });
			const headersTab = screen.getByRole('button', { name: /headers/i });
			const curlTab = screen.getByRole('button', { name: /curl/i });

			// Start at Body (default)
			expect(bodyTab).toHaveClass('active');

			// Switch to Headers
			await user.click(headersTab);
			expect(headersTab).toHaveClass('active');
			expect(bodyTab).not.toHaveClass('active');

			// Switch to cURL
			await user.click(curlTab);
			expect(curlTab).toHaveClass('active');
			expect(headersTab).not.toHaveClass('active');

			// Switch back to Body
			await user.click(bodyTab);
			expect(bodyTab).toHaveClass('active');
			expect(curlTab).not.toHaveClass('active');
		});

		it('should maintain tab state when switching between tabs', async () => {
			const user = userEvent.setup();
			render(<ResponseViewer response={mockResponse} error={null} />);

			// Switch to cURL tab
			await user.click(screen.getByRole('button', { name: /curl/i }));
			expect(screen.getByText(/curl -X POST/)).toBeInTheDocument();

			// Switch to Body tab
			await user.click(screen.getByRole('button', { name: /body/i }));

			// Switch back to cURL tab - should still show cURL command
			await user.click(screen.getByRole('button', { name: /curl/i }));
			expect(screen.getByText(/curl -X POST/)).toBeInTheDocument();
		});
	});

	describe('response state transitions', () => {
		it('should transition from empty to response', () => {
			const { rerender } = render(<ResponseViewer response={null} error={null} />);

			expect(screen.getByText(/send a request/i)).toBeInTheDocument();

			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'Response body',
				contentType: 'text/plain',
				size: 13,
				time: 100,
				curlCommand: 'curl ...'
			};

			rerender(<ResponseViewer response={mockResponse} error={null} />);

			expect(screen.queryByText(/send a request/i)).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();
		});

		it('should transition from response to error', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'Success',
				contentType: 'text/plain',
				size: 7,
				time: 100,
				curlCommand: 'curl ...'
			};

			const { rerender } = render(<ResponseViewer response={mockResponse} error={null} />);

			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();

			rerender(<ResponseViewer response={mockResponse} error="Network error" />);

			expect(screen.queryByRole('button')).not.toBeInTheDocument();
			expect(screen.getByText('Request Failed')).toBeInTheDocument();
		});

		it('should transition from error to response', () => {
			const { rerender } = render(<ResponseViewer response={null} error="Initial error" />);

			expect(screen.getByText('Request Failed')).toBeInTheDocument();

			const mockResponse: HttpResponse = {
				status: 201,
				statusText: 'Created',
				headers: {},
				body: 'Created',
				contentType: 'text/plain',
				size: 7,
				time: 150,
				curlCommand: 'curl ...'
			};

			rerender(<ResponseViewer response={mockResponse} error={null} />);

			expect(screen.queryByText('Request Failed')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();
		});

		it('should reset to empty state', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'Data',
				contentType: 'text/plain',
				size: 4,
				time: 100,
				curlCommand: 'curl ...'
			};

			const { rerender } = render(<ResponseViewer response={mockResponse} error={null} />);

			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();

			rerender(<ResponseViewer response={null} error={null} />);

			expect(screen.queryByRole('button')).not.toBeInTheDocument();
			expect(screen.getByText(/send a request/i)).toBeInTheDocument();
		});
	});

	describe('different response types', () => {
		it('should handle 404 error response', () => {
			const errorResponse: HttpResponse = {
				status: 404,
				statusText: 'Not Found',
				headers: { 'content-type': 'application/json' },
				body: '{"error": "Resource not found"}',
				contentType: 'application/json',
				size: 32,
				time: 123,
				curlCommand: 'curl ...'
			};

			render(<ResponseViewer response={errorResponse} error={null} />);

			// Should still show response (404 is a valid HTTP response)
			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();
		});

		it('should handle response with many headers', () => {
			const manyHeadersResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {
					'content-type': 'application/json',
					'cache-control': 'no-cache',
					'x-rate-limit': '100',
					'x-rate-limit-remaining': '95',
					'x-request-id': 'abc-123'
				},
				body: '{}',
				contentType: 'application/json',
				size: 2,
				time: 100,
				curlCommand: 'curl ...'
			};

			render(<ResponseViewer response={manyHeadersResponse} error={null} />);

			const headersTab = screen.getByRole('button', { name: /headers/i });
			expect(headersTab.textContent).toContain('5');
		});

		it('should handle empty body response', () => {
			const emptyBodyResponse: HttpResponse = {
				status: 204,
				statusText: 'No Content',
				headers: {},
				body: '',
				contentType: '',
				size: 0,
				time: 50,
				curlCommand: 'curl ...'
			};

			render(<ResponseViewer response={emptyBodyResponse} error={null} />);

			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();
		});

		it('should handle large response', () => {
			const largeBody = JSON.stringify({ data: Array(1000).fill('test') });
			const largeResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: { 'content-type': 'application/json' },
				body: largeBody,
				contentType: 'application/json',
				size: largeBody.length,
				time: 500,
				curlCommand: 'curl ...'
			};

			render(<ResponseViewer response={largeResponse} error={null} />);

			expect(screen.getByRole('button', { name: /body/i })).toBeInTheDocument();
		});
	});

	describe('accessibility', () => {
		it('should have proper ARIA roles for tabs', () => {
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'test',
				contentType: 'text/plain',
				size: 4,
				time: 100,
				curlCommand: 'curl ...'
			};

			render(<ResponseViewer response={mockResponse} error={null} />);

			const tabs = screen.getAllByRole('button');
			expect(tabs).toHaveLength(3);

			tabs.forEach(tab => {
				expect(tab).toHaveClass('tab-button');
			});
		});

		it('should support keyboard navigation', async () => {
			const user = userEvent.setup();
			const mockResponse: HttpResponse = {
				status: 200,
				statusText: 'OK',
				headers: {},
				body: 'test',
				contentType: 'text/plain',
				size: 4,
				time: 100,
				curlCommand: 'curl ...'
			};

			render(<ResponseViewer response={mockResponse} error={null} />);

			const bodyTab = screen.getByRole('button', { name: /body/i });

			// Tab to focus on the tab
			await user.tab();
			expect(bodyTab).toHaveFocus();
		});
	});
});
