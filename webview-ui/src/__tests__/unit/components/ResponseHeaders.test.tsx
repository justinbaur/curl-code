import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseHeaders } from '../../../components/ResponseViewer/ResponseHeaders';

describe('ResponseHeaders', () => {
	describe('rendering', () => {
		it('should render empty state when no headers', () => {
			render(<ResponseHeaders headers={{}} />);

			expect(screen.getByText('No response headers')).toBeInTheDocument();
		});

		it('should apply empty-state class when no headers', () => {
			const { container } = render(<ResponseHeaders headers={{}} />);

			expect(container.querySelector('.empty-state')).toBeInTheDocument();
		});

		it('should render single header', () => {
			const headers = { 'Content-Type': 'application/json' };
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('Content-Type')).toBeInTheDocument();
			expect(screen.getByText('application/json')).toBeInTheDocument();
		});

		it('should render multiple headers', () => {
			const headers = {
				'Content-Type': 'application/json',
				'Content-Length': '1234',
				Server: 'nginx',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('Content-Type')).toBeInTheDocument();
			expect(screen.getByText('application/json')).toBeInTheDocument();
			expect(screen.getByText('Content-Length')).toBeInTheDocument();
			expect(screen.getByText('1234')).toBeInTheDocument();
			expect(screen.getByText('Server')).toBeInTheDocument();
			expect(screen.getByText('nginx')).toBeInTheDocument();
		});

		it('should apply response-headers class to container', () => {
			const headers = { 'Content-Type': 'text/plain' };
			const { container } = render(<ResponseHeaders headers={headers} />);

			expect(container.querySelector('.response-headers')).toBeInTheDocument();
		});

		it('should apply response-header class to each header', () => {
			const headers = {
				'Content-Type': 'application/json',
				Server: 'nginx',
			};
			const { container } = render(<ResponseHeaders headers={headers} />);

			const headerElements = container.querySelectorAll('.response-header');
			expect(headerElements).toHaveLength(2);
		});

		it('should apply response-header-key class to header names', () => {
			const headers = { 'Content-Type': 'application/json' };
			const { container } = render(<ResponseHeaders headers={headers} />);

			const keyElement = container.querySelector('.response-header-key');
			expect(keyElement).toBeInTheDocument();
			expect(keyElement?.textContent).toBe('Content-Type');
		});

		it('should apply response-header-value class to header values', () => {
			const headers = { 'Content-Type': 'application/json' };
			const { container } = render(<ResponseHeaders headers={headers} />);

			const valueElement = container.querySelector('.response-header-value');
			expect(valueElement).toBeInTheDocument();
			expect(valueElement?.textContent).toBe('application/json');
		});
	});

	describe('header entries', () => {
		it('should render common response headers', () => {
			const headers = {
				'Content-Type': 'application/json',
				'Content-Length': '256',
				'Cache-Control': 'no-cache',
				'X-Powered-By': 'Express',
			};
			render(<ResponseHeaders headers={headers} />);

			Object.entries(headers).forEach(([key, value]) => {
				expect(screen.getByText(key)).toBeInTheDocument();
				expect(screen.getByText(value)).toBeInTheDocument();
			});
		});

		it('should render custom headers', () => {
			const headers = {
				'X-Custom-Header': 'custom-value',
				'X-Request-ID': '12345-67890',
				'X-Rate-Limit': '100',
			};
			render(<ResponseHeaders headers={headers} />);

			Object.entries(headers).forEach(([key, value]) => {
				expect(screen.getByText(key)).toBeInTheDocument();
				expect(screen.getByText(value)).toBeInTheDocument();
			});
		});

		it('should render security headers', () => {
			const headers = {
				'Strict-Transport-Security': 'max-age=31536000',
				'Content-Security-Policy': "default-src 'self'",
				'X-Frame-Options': 'DENY',
			};
			render(<ResponseHeaders headers={headers} />);

			Object.entries(headers).forEach(([key, value]) => {
				expect(screen.getByText(key)).toBeInTheDocument();
				expect(screen.getByText(value)).toBeInTheDocument();
			});
		});

		it('should render CORS headers', () => {
			const headers = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			};
			render(<ResponseHeaders headers={headers} />);

			Object.entries(headers).forEach(([key, value]) => {
				expect(screen.getByText(key)).toBeInTheDocument();
				expect(screen.getByText(value)).toBeInTheDocument();
			});
		});
	});

	describe('edge cases', () => {
		it('should handle header with empty string value', () => {
			const headers = { 'X-Empty': '' };
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('X-Empty')).toBeInTheDocument();
			const { container } = render(<ResponseHeaders headers={headers} />);
			const valueElement = container.querySelector('.response-header-value');
			expect(valueElement?.textContent).toBe('');
		});

		it('should handle header with very long value', () => {
			const longValue = 'a'.repeat(500);
			const headers = { 'X-Long-Header': longValue };
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('X-Long-Header')).toBeInTheDocument();
			expect(screen.getByText(longValue)).toBeInTheDocument();
		});

		it('should handle header with special characters in value', () => {
			const headers = {
				'Set-Cookie': 'session=abc123; Path=/; HttpOnly; Secure',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('Set-Cookie')).toBeInTheDocument();
			expect(screen.getByText('session=abc123; Path=/; HttpOnly; Secure')).toBeInTheDocument();
		});

		it('should handle header with URL in value', () => {
			const headers = {
				Location: 'https://example.com/redirect?param=value',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('Location')).toBeInTheDocument();
			expect(screen.getByText('https://example.com/redirect?param=value')).toBeInTheDocument();
		});

		it('should handle header with comma-separated values', () => {
			const headers = {
				'Accept-Encoding': 'gzip, deflate, br',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('Accept-Encoding')).toBeInTheDocument();
			expect(screen.getByText('gzip, deflate, br')).toBeInTheDocument();
		});

		it('should handle header with numeric value', () => {
			const headers = {
				'Content-Length': '1024',
				'X-Rate-Limit': '60',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('Content-Length')).toBeInTheDocument();
			expect(screen.getByText('1024')).toBeInTheDocument();
			expect(screen.getByText('X-Rate-Limit')).toBeInTheDocument();
			expect(screen.getByText('60')).toBeInTheDocument();
		});

		it('should handle header with date value', () => {
			const headers = {
				Date: 'Wed, 21 Oct 2023 07:28:00 GMT',
				Expires: 'Thu, 22 Oct 2023 07:28:00 GMT',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('Date')).toBeInTheDocument();
			expect(screen.getByText('Wed, 21 Oct 2023 07:28:00 GMT')).toBeInTheDocument();
			expect(screen.getByText('Expires')).toBeInTheDocument();
			expect(screen.getByText('Thu, 22 Oct 2023 07:28:00 GMT')).toBeInTheDocument();
		});

		it('should handle header with quoted value', () => {
			const headers = {
				ETag: '"33a64df551425fcc55e4d42a148795d9f25f89d4"',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('ETag')).toBeInTheDocument();
			expect(screen.getByText('"33a64df551425fcc55e4d42a148795d9f25f89d4"')).toBeInTheDocument();
		});

		it('should handle many headers', () => {
			const headers = Object.fromEntries(
				Array.from({ length: 50 }, (_, i) => [`X-Header-${i}`, `value-${i}`])
			);
			const { container } = render(<ResponseHeaders headers={headers} />);

			const headerElements = container.querySelectorAll('.response-header');
			expect(headerElements).toHaveLength(50);
		});

		it('should handle header names with different casing', () => {
			const headers = {
				'content-type': 'application/json',
				'Content-Length': '256',
				'CACHE-CONTROL': 'no-cache',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('content-type')).toBeInTheDocument();
			expect(screen.getByText('Content-Length')).toBeInTheDocument();
			expect(screen.getByText('CACHE-CONTROL')).toBeInTheDocument();
		});

		it('should handle header with multiline value', () => {
			const headers = {
				'X-Custom': 'line1\nline2\nline3',
			};
			const { container } = render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('X-Custom')).toBeInTheDocument();
			const valueSpan = container.querySelector('.response-header-value');
			expect(valueSpan?.textContent).toBe('line1\nline2\nline3');
		});

		it('should handle header with whitespace in value', () => {
			const headers = {
				'X-Whitespace': '  value with spaces  ',
			};
			const { container } = render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('X-Whitespace')).toBeInTheDocument();
			const valueSpan = container.querySelector('.response-header-value');
			expect(valueSpan?.textContent).toBe('  value with spaces  ');
		});
	});

	describe('key uniqueness', () => {
		it('should use header key as React key', () => {
			const headers = {
				'Content-Type': 'application/json',
				Server: 'nginx',
			};
			const { container } = render(<ResponseHeaders headers={headers} />);

			const headerElements = container.querySelectorAll('.response-header');
			expect(headerElements).toHaveLength(2);
		});

		it('should handle duplicate-like keys correctly', () => {
			// Note: Object keys must be unique, but testing the behavior
			const headers = {
				'X-Custom-1': 'value1',
				'X-Custom-2': 'value2',
			};
			render(<ResponseHeaders headers={headers} />);

			expect(screen.getByText('X-Custom-1')).toBeInTheDocument();
			expect(screen.getByText('value1')).toBeInTheDocument();
			expect(screen.getByText('X-Custom-2')).toBeInTheDocument();
			expect(screen.getByText('value2')).toBeInTheDocument();
		});
	});

	describe('rendering order', () => {
		it('should render headers in object order', () => {
			const headers = {
				'Content-Type': 'application/json',
				'Content-Length': '256',
				Server: 'nginx',
			};
			const { container } = render(<ResponseHeaders headers={headers} />);

			const headerElements = container.querySelectorAll('.response-header-key');
			const headerTexts = Array.from(headerElements).map((el) => el.textContent);

			expect(headerTexts).toEqual(['Content-Type', 'Content-Length', 'Server']);
		});
	});
});
