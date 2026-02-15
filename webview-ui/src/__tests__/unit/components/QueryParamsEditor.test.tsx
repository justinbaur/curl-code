import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryParamsEditor } from '../../../components/RequestBuilder/QueryParamsEditor';
import type { QueryParam } from '../../../vscode';

// Mock KeyValueEditor to isolate QueryParamsEditor logic
vi.mock('../../../components/common/KeyValueEditor', () => ({
	KeyValueEditor: ({ items, onChange, keyPlaceholder, valuePlaceholder }: any) => (
		<div data-testid="key-value-editor">
			<div data-testid="key-placeholder">{keyPlaceholder}</div>
			<div data-testid="value-placeholder">{valuePlaceholder}</div>
			<div data-testid="items-count">{items.length}</div>
			<button
				data-testid="trigger-change"
				onClick={() => onChange([...items, { key: 'newParam', value: 'newValue', enabled: true }])}
			>
				Add Param
			</button>
		</div>
	),
}));

describe('QueryParamsEditor', () => {
	describe('rendering', () => {
		it('should render KeyValueEditor', () => {
			const params: QueryParam[] = [];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('key-value-editor')).toBeInTheDocument();
		});

		it('should pass params to KeyValueEditor', () => {
			const params: QueryParam[] = [
				{ key: 'page', value: '1', enabled: true },
				{ key: 'limit', value: '50', enabled: true },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('2');
		});

		it('should pass correct placeholders to KeyValueEditor', () => {
			const params: QueryParam[] = [];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('key-placeholder')).toHaveTextContent('Parameter name');
			expect(screen.getByTestId('value-placeholder')).toHaveTextContent('Parameter value');
		});

		it('should have query-params-editor class', () => {
			const params: QueryParam[] = [];
			const onChange = vi.fn();

			const { container } = render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(container.querySelector('.query-params-editor')).toBeInTheDocument();
		});
	});

	describe('onChange', () => {
		it('should call onChange when KeyValueEditor triggers change', async () => {
			const params: QueryParam[] = [
				{ key: 'search', value: 'test', enabled: true },
			];
			const onChange = vi.fn();
			const user = userEvent.setup();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			const addButton = screen.getByTestId('trigger-change');
			await user.click(addButton);

			expect(onChange).toHaveBeenCalledWith([
				{ key: 'search', value: 'test', enabled: true },
				{ key: 'newParam', value: 'newValue', enabled: true },
			]);
		});

		it('should handle empty params array', () => {
			const params: QueryParam[] = [];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('0');
		});

		it('should handle params with disabled items', () => {
			const params: QueryParam[] = [
				{ key: 'page', value: '1', enabled: true },
				{ key: 'filter', value: 'inactive', enabled: false },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('2');
		});
	});

	describe('integration with KeyValueEditor', () => {
		it('should preserve param structure when passed through', async () => {
			const params: QueryParam[] = [
				{ key: 'sort', value: 'desc', enabled: true },
			];
			const onChange = vi.fn();
			const user = userEvent.setup();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			const addButton = screen.getByTestId('trigger-change');
			await user.click(addButton);

			const newParams = onChange.mock.calls[0][0];
			expect(newParams).toHaveLength(2);
			expect(newParams[0]).toEqual({ key: 'sort', value: 'desc', enabled: true });
		});
	});

	describe('edge cases', () => {
		it('should handle large number of params', () => {
			const params: QueryParam[] = Array.from({ length: 100 }, (_, i) => ({
				key: `param${i}`,
				value: `value${i}`,
				enabled: true,
			}));
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('100');
		});

		it('should handle params with empty keys', () => {
			const params: QueryParam[] = [
				{ key: '', value: 'value', enabled: true },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('1');
		});

		it('should handle params with empty values', () => {
			const params: QueryParam[] = [
				{ key: 'emptyParam', value: '', enabled: true },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('1');
		});

		it('should handle params with special characters', () => {
			const params: QueryParam[] = [
				{ key: 'search', value: 'hello world & special=chars', enabled: true },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('1');
		});

		it('should handle params with URL-encoded values', () => {
			const params: QueryParam[] = [
				{ key: 'redirect', value: 'https%3A%2F%2Fexample.com%2Fpath', enabled: true },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('1');
		});

		it('should handle params with numeric values', () => {
			const params: QueryParam[] = [
				{ key: 'page', value: '1', enabled: true },
				{ key: 'limit', value: '100', enabled: true },
				{ key: 'offset', value: '0', enabled: true },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('3');
		});

		it('should handle params with boolean-like values', () => {
			const params: QueryParam[] = [
				{ key: 'active', value: 'true', enabled: true },
				{ key: 'verified', value: 'false', enabled: true },
			];
			const onChange = vi.fn();

			render(<QueryParamsEditor params={params} onChange={onChange} />);

			expect(screen.getByTestId('items-count')).toHaveTextContent('2');
		});
	});
});
