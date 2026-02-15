import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeadersEditor } from '../../../components/RequestBuilder/HeadersEditor';
import type { HttpHeader } from '../../../vscode';

// Mock KeyValueEditor to isolate HeadersEditor logic
vi.mock('../../../components/common/KeyValueEditor', () => ({
	KeyValueEditor: ({ items, onChange, keyPlaceholder, valuePlaceholder }: any) => (
		<div data-testid="key-value-editor">
			<div data-testid="key-placeholder">{keyPlaceholder}</div>
			<div data-testid="value-placeholder">{valuePlaceholder}</div>
			<div data-testid="items-count">{items.length}</div>
			<button
				data-testid="trigger-change"
				onClick={() => onChange([...items, { key: 'New', value: 'Header', enabled: true }])}
			>
				Add Header
			</button>
		</div>
	),
}));

describe('HeadersEditor', () => {
	describe('rendering', () => {
		it('should render KeyValueEditor', () => {
			const headers: HttpHeader[] = [];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('key-value-editor')).toBeInTheDocument();
		});

		it('should pass headers to KeyValueEditor', () => {
			const headers: HttpHeader[] = [
				{ key: 'Content-Type', value: 'application/json', enabled: true },
				{ key: 'Authorization', value: 'Bearer token', enabled: true },
			];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('2');
		});

		it('should pass correct placeholders to KeyValueEditor', () => {
			const headers: HttpHeader[] = [];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('key-placeholder')).toHaveTextContent('Header name');
			expect(screen.getByTestId('value-placeholder')).toHaveTextContent('Header value');
		});

		it('should have headers-editor class', () => {
			const headers: HttpHeader[] = [];
			const onChange = vi.fn();

			const { container } = render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(container.querySelector('.headers-editor')).toBeInTheDocument();
		});
	});

	describe('onChange', () => {
		it('should call onChange when KeyValueEditor triggers change', async () => {
			const headers: HttpHeader[] = [
				{ key: 'Content-Type', value: 'application/json', enabled: true },
			];
			const onChange = vi.fn();
			const user = userEvent.setup();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			const addButton = screen.getByTestId('trigger-change');
			await user.click(addButton);

			expect(onChange).toHaveBeenCalledWith([
				{ key: 'Content-Type', value: 'application/json', enabled: true },
				{ key: 'New', value: 'Header', enabled: true },
			]);
		});

		it('should handle empty headers array', () => {
			const headers: HttpHeader[] = [];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('0');
		});

		it('should handle headers with disabled items', () => {
			const headers: HttpHeader[] = [
				{ key: 'Content-Type', value: 'application/json', enabled: true },
				{ key: 'X-Custom', value: 'disabled', enabled: false },
			];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('2');
		});
	});

	describe('integration with KeyValueEditor', () => {
		it('should preserve header structure when passed through', async () => {
			const headers: HttpHeader[] = [
				{ key: 'Accept', value: 'application/json', enabled: true },
			];
			const onChange = vi.fn();
			const user = userEvent.setup();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			const addButton = screen.getByTestId('trigger-change');
			await user.click(addButton);

			const newHeaders = onChange.mock.calls[0][0];
			expect(newHeaders).toHaveLength(2);
			expect(newHeaders[0]).toEqual({ key: 'Accept', value: 'application/json', enabled: true });
		});
	});

	describe('edge cases', () => {
		it('should handle large number of headers', () => {
			const headers: HttpHeader[] = Array.from({ length: 100 }, (_, i) => ({
				key: `Header-${i}`,
				value: `Value-${i}`,
				enabled: true,
			}));
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('100');
		});

		it('should handle headers with empty keys', () => {
			const headers: HttpHeader[] = [
				{ key: '', value: 'value', enabled: true },
			];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('1');
		});

		it('should handle headers with empty values', () => {
			const headers: HttpHeader[] = [
				{ key: 'X-Custom', value: '', enabled: true },
			];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('1');
		});

		it('should handle headers with special characters', () => {
			const headers: HttpHeader[] = [
				{ key: 'X-Custom-Header', value: 'value;with=special&chars', enabled: true },
			];
			const onChange = vi.fn();

			render(<HeadersEditor headers={headers} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('1');
		});
	});
});
