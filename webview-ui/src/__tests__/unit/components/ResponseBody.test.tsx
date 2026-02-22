import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseBody } from '../../../components/ResponseViewer/ResponseBody';

describe('ResponseBody', () => {
	describe('rendering', () => {
		it('should render empty state when body is empty string', () => {
			render(<ResponseBody body="" contentType="text/plain" />);

			expect(screen.getByText('No response body')).toBeInTheDocument();
		});

		it('should render body in pre tag when body exists', () => {
			render(<ResponseBody body="Hello World" contentType="text/plain" />);

			const pre = screen.getByText('Hello World');
			expect(pre.tagName).toBe('PRE');
		});

		it('should apply response-body class to container', () => {
			const { container } = render(<ResponseBody body="test" contentType="text/plain" />);

			expect(container.querySelector('.response-body')).toBeInTheDocument();
		});

		it('should apply empty-state class when no body', () => {
			const { container } = render(<ResponseBody body="" contentType="text/plain" />);

			expect(container.querySelector('.empty-state')).toBeInTheDocument();
		});
	});

	describe('JSON formatting', () => {
		it('should format valid JSON when content type is application/json', () => {
			const json = '{"name":"John","age":30}';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify({ name: 'John', age: 30 }, null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should format nested JSON correctly', () => {
			const json = '{"user":{"name":"Jane","address":{"city":"NYC"}}}';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify(
				{ user: { name: 'Jane', address: { city: 'NYC' } } },
				null,
				2
			);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should format JSON arrays', () => {
			const json = '[{"id":1},{"id":2},{"id":3}]';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }], null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should handle content type with charset (application/json; charset=utf-8)', () => {
			const json = '{"status":"ok"}';
			const { container } = render(<ResponseBody body={json} contentType="application/json; charset=utf-8" />);

			const expected = JSON.stringify({ status: 'ok' }, null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should not format when content type is not JSON', () => {
			const text = '{"this":"looks like json"}';
			render(<ResponseBody body={text} contentType="text/plain" />);

			// Should render as-is, not formatted
			expect(screen.getByText(text)).toBeInTheDocument();
		});

		it('should handle invalid JSON gracefully', () => {
			const invalidJson = '{invalid json content}';
			render(<ResponseBody body={invalidJson} contentType="application/json" />);

			// Should render as-is when JSON parsing fails
			expect(screen.getByText(invalidJson)).toBeInTheDocument();
		});

		it('should handle empty JSON object', () => {
			const json = '{}';
			render(<ResponseBody body={json} contentType="application/json" />);

			expect(screen.getByText('{}' )).toBeInTheDocument();
		});

		it('should handle empty JSON array', () => {
			const json = '[]';
			render(<ResponseBody body={json} contentType="application/json" />);

			expect(screen.getByText('[]')).toBeInTheDocument();
		});

		it('should preserve JSON formatting with special characters', () => {
			const json = '{"message":"Hello\\nWorld","emoji":"😀"}';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify({ message: 'Hello\nWorld', emoji: '😀' }, null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});
	});

	describe('content type handling', () => {
		it('should handle application/json', () => {
			const json = '{"test":true}';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify({ test: true }, null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should handle text/plain without formatting', () => {
			const text = 'Plain text response';
			render(<ResponseBody body={text} contentType="text/plain" />);

			expect(screen.getByText('Plain text response')).toBeInTheDocument();
		});

		it('should handle text/html without formatting', () => {
			const html = '<html><body>Hello</body></html>';
			render(<ResponseBody body={html} contentType="text/html" />);

			expect(screen.getByText(html)).toBeInTheDocument();
		});

		it('should handle text/xml without formatting', () => {
			const xml = '<root><item>Test</item></root>';
			render(<ResponseBody body={xml} contentType="text/xml" />);

			expect(screen.getByText(xml)).toBeInTheDocument();
		});

		it('should handle empty content type', () => {
			const text = 'Some content';
			render(<ResponseBody body={text} contentType="" />);

			expect(screen.getByText('Some content')).toBeInTheDocument();
		});

		it('should handle uppercase content type', () => {
			const json = '{"status":"ok"}';
			render(<ResponseBody body={json} contentType="APPLICATION/JSON" />);

			// Should not format because check is case-sensitive
			expect(screen.getByText(json)).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should handle very long body', () => {
			const longBody = 'a'.repeat(10000);
			render(<ResponseBody body={longBody} contentType="text/plain" />);

			expect(screen.getByText(longBody)).toBeInTheDocument();
		});

		it('should handle multiline plain text', () => {
			const multiline = 'Line 1\nLine 2\nLine 3';
			const { container } = render(<ResponseBody body={multiline} contentType="text/plain" />);

			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(multiline);
		});

		it('should handle body with only whitespace', () => {
			const whitespace = '   \n\t  ';
			const { container } = render(<ResponseBody body={whitespace} contentType="text/plain" />);

			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(whitespace);
		});

		it('should handle large JSON object', () => {
			const largeJson = JSON.stringify({
				items: Array.from({ length: 100 }, (_, i) => ({
					id: i,
					name: `Item ${i}`,
					value: Math.random(),
				})),
			});

			const { container } = render(<ResponseBody body={largeJson} contentType="application/json" />);

			const expected = JSON.stringify(JSON.parse(largeJson), null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should handle deeply nested JSON', () => {
			const deepJson = '{"a":{"b":{"c":{"d":{"e":"value"}}}}}';
			const { container } = render(<ResponseBody body={deepJson} contentType="application/json" />);

			const expected = JSON.stringify(
				{ a: { b: { c: { d: { e: 'value' } } } } },
				null,
				2
			);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should handle JSON with null values', () => {
			const json = '{"name":"test","value":null}';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify({ name: 'test', value: null }, null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should handle JSON with boolean values', () => {
			const json = '{"active":true,"verified":false}';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify({ active: true, verified: false }, null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});

		it('should handle JSON with number values', () => {
			const json = '{"count":42,"price":19.99,"negative":-5}';
			const { container } = render(<ResponseBody body={json} contentType="application/json" />);

			const expected = JSON.stringify(
				{ count: 42, price: 19.99, negative: -5 },
				null,
				2
			);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});
	});

	describe('useMemo optimization', () => {
		it('should not reformat when neither body nor contentType changes', () => {
			const json = '{"test":"value"}';
			const { rerender } = render(
				<ResponseBody body={json} contentType="application/json" />
			);

			const firstRender = screen.getByText(/test/).textContent;

			// Rerender with same props
			rerender(<ResponseBody body={json} contentType="application/json" />);

			const secondRender = screen.getByText(/test/).textContent;

			expect(firstRender).toBe(secondRender);
		});

		it('should reformat when contentType changes', () => {
			const json = '{"test":"value"}';
			const { rerender, container } = render(
				<ResponseBody body={json} contentType="text/plain" />
			);

			// Should render as-is
			expect(screen.getByText(json)).toBeInTheDocument();

			rerender(<ResponseBody body={json} contentType="application/json" />);

			// Should now be formatted
			const expected = JSON.stringify({ test: 'value' }, null, 2);
			const pre = container.querySelector('pre');
			expect(pre?.textContent).toBe(expected);
		});
	});
});
