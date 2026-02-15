import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MethodSelector } from '../../../components/RequestBuilder/MethodSelector';
import type { HttpRequest } from '../../../vscode';

describe('MethodSelector', () => {
	describe('rendering', () => {
		it('should render with GET method selected', () => {
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const select = screen.getByRole('combobox');
			expect(select).toHaveValue('GET');
		});

		it('should render with POST method selected', () => {
			const onChange = vi.fn();
			render(<MethodSelector value="POST" onChange={onChange} />);

			const select = screen.getByRole('combobox');
			expect(select).toHaveValue('POST');
		});

		it('should render all HTTP methods as options', () => {
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const expectedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

			expectedMethods.forEach((method) => {
				expect(screen.getByRole('option', { name: method })).toBeInTheDocument();
			});
		});

		it('should have correct number of options', () => {
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const options = screen.getAllByRole('option');
			expect(options).toHaveLength(7);
		});

		it('should apply method-specific CSS class', () => {
			const onChange = vi.fn();
			const { rerender } = render(<MethodSelector value="GET" onChange={onChange} />);

			let select = screen.getByRole('combobox');
			expect(select).toHaveClass('method-get');

			rerender(<MethodSelector value="POST" onChange={onChange} />);
			select = screen.getByRole('combobox');
			expect(select).toHaveClass('method-post');

			rerender(<MethodSelector value="DELETE" onChange={onChange} />);
			select = screen.getByRole('combobox');
			expect(select).toHaveClass('method-delete');
		});
	});

	describe('user interactions', () => {
		it('should call onChange when method is changed', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'POST');

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith('POST');
		});

		it('should call onChange with correct method for each selection', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const select = screen.getByRole('combobox');

			await user.selectOptions(select, 'PUT');
			expect(onChange).toHaveBeenLastCalledWith('PUT');

			await user.selectOptions(select, 'PATCH');
			expect(onChange).toHaveBeenLastCalledWith('PATCH');

			await user.selectOptions(select, 'DELETE');
			expect(onChange).toHaveBeenLastCalledWith('DELETE');

			expect(onChange).toHaveBeenCalledTimes(3);
		});

		it('should not call onChange when component is just rendered', () => {
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			expect(onChange).not.toHaveBeenCalled();
		});

		it('should allow selecting all available methods', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const select = screen.getByRole('combobox');
			const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

			for (const method of methods) {
				onChange.mockClear();
				await user.selectOptions(select, method);

				if (method !== 'GET') {
					// GET was initial value, so onChange won't be called for it
					expect(onChange).toHaveBeenCalledWith(method);
				}
			}
		});
	});

	describe('controlled component behavior', () => {
		it('should update when value prop changes', () => {
			const onChange = vi.fn();
			const { rerender } = render(<MethodSelector value="GET" onChange={onChange} />);

			let select = screen.getByRole('combobox');
			expect(select).toHaveValue('GET');

			rerender(<MethodSelector value="POST" onChange={onChange} />);
			select = screen.getByRole('combobox');
			expect(select).toHaveValue('POST');

			rerender(<MethodSelector value="DELETE" onChange={onChange} />);
			select = screen.getByRole('combobox');
			expect(select).toHaveValue('DELETE');
		});

		it('should reflect value prop even after user interaction', async () => {
			const user = userEvent.setup();
			let currentValue: HttpRequest['method'] = 'GET';
			const onChange = vi.fn((newValue) => {
				currentValue = newValue;
			});

			const { rerender } = render(
				<MethodSelector value={currentValue} onChange={onChange} />
			);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'POST');

			// Rerender with updated value (simulating parent state update)
			rerender(<MethodSelector value="POST" onChange={onChange} />);
			expect(currentValue).toEqual('POST');
			expect(screen.getByRole('combobox')).toHaveValue('POST');
		});
	});

	describe('accessibility', () => {
		it('should be keyboard accessible', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const select = screen.getByRole('combobox');

			// Tab to focus
			await user.tab();
			expect(select).toHaveFocus();

			// Arrow keys to navigate (implementation varies by browser)
			// Just verify the select is interactive
			expect(select).toBeEnabled();
		});

		it('should have combobox role', () => {
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			expect(screen.getByRole('combobox')).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should handle rapid method changes', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const select = screen.getByRole('combobox');

			await user.selectOptions(select, 'POST');
			await user.selectOptions(select, 'PUT');
			await user.selectOptions(select, 'PATCH');
			await user.selectOptions(select, 'DELETE');

			expect(onChange).toHaveBeenCalledTimes(4);
			expect(onChange).toHaveBeenNthCalledWith(1, 'POST');
			expect(onChange).toHaveBeenNthCalledWith(2, 'PUT');
			expect(onChange).toHaveBeenNthCalledWith(3, 'PATCH');
			expect(onChange).toHaveBeenNthCalledWith(4, 'DELETE');
		});

		it('should handle selecting the same method twice', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MethodSelector value="GET" onChange={onChange} />);

			const select = screen.getByRole('combobox');

			await user.selectOptions(select, 'POST');
			expect(onChange).toHaveBeenCalledTimes(1);

			await user.selectOptions(select, 'POST');
			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenNthCalledWith(2, 'POST');
		});
	});
});
