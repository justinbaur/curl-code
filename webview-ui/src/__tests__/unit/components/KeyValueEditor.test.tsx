import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyValueEditor, type KeyValueItem } from '../../../components/common/KeyValueEditor';

describe('KeyValueEditor', () => {
	describe('rendering', () => {
		it('should render with empty items', () => {
			const onChange = vi.fn();
			render(<KeyValueEditor items={[]} onChange={onChange} />);

			expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
		});

		it('should render single item', () => {
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'Content-Type', value: 'application/json', enabled: true }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			expect(screen.getByDisplayValue('Content-Type')).toBeInTheDocument();
			expect(screen.getByDisplayValue('application/json')).toBeInTheDocument();
			expect(screen.getByRole('checkbox')).toBeChecked();
		});

		it('should render multiple items', () => {
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'Authorization', value: 'Bearer token', enabled: true },
				{ key: 'Accept', value: 'application/json', enabled: true },
				{ key: 'X-Custom', value: 'custom-value', enabled: false }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			expect(screen.getByDisplayValue('Authorization')).toBeInTheDocument();
			expect(screen.getByDisplayValue('Bearer token')).toBeInTheDocument();
			expect(screen.getByDisplayValue('Accept')).toBeInTheDocument();
			expect(screen.getByDisplayValue('application/json')).toBeInTheDocument();
			expect(screen.getByDisplayValue('X-Custom')).toBeInTheDocument();
			expect(screen.getByDisplayValue('custom-value')).toBeInTheDocument();
		});

		it('should render with custom placeholders', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const { rerender } = render(
				<KeyValueEditor
					items={[]}
					onChange={onChange}
					keyPlaceholder="Header Name"
					valuePlaceholder="Header Value"
				/>
			);

			// Add an item to see placeholders
			const addButton = screen.getByRole('button', { name: /add/i });
			await user.click(addButton);

			// Rerender with the new item (simulating parent state update)
			rerender(
				<KeyValueEditor
					items={[{ key: '', value: '', enabled: true }]}
					onChange={onChange}
					keyPlaceholder="Header Name"
					valuePlaceholder="Header Value"
				/>
			);

			const inputs = screen.getAllByRole('textbox');
			expect(inputs[0]).toHaveAttribute('placeholder', 'Header Name');
			expect(inputs[1]).toHaveAttribute('placeholder', 'Header Value');
		});

		it('should render delete button for each item', () => {
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'key1', value: 'value1', enabled: true },
				{ key: 'key2', value: 'value2', enabled: true }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			const deleteButtons = screen.getAllByRole('button', { name: '×' });
			expect(deleteButtons).toHaveLength(2);
		});

		it('should render checkbox for each item', () => {
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'key1', value: 'value1', enabled: true },
				{ key: 'key2', value: 'value2', enabled: false }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(2);
			expect(checkboxes[0]).toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();
		});
	});

	describe('adding items', () => {
		it('should add new item when Add button is clicked', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<KeyValueEditor items={[]} onChange={onChange} />);

			const addButton = screen.getByRole('button', { name: /add/i });
			await user.click(addButton);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith([
				{ key: '', value: '', enabled: true }
			]);
		});

		it('should add multiple items sequentially', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const { rerender } = render(<KeyValueEditor items={[]} onChange={onChange} />);

			const addButton = screen.getByRole('button', { name: /add/i });

			// Add first item
			await user.click(addButton);
			expect(onChange).toHaveBeenCalledWith([
				{ key: '', value: '', enabled: true }
			]);

			// Simulate parent updating with new items
			const items1 = [{ key: '', value: '', enabled: true }];
			rerender(<KeyValueEditor items={items1} onChange={onChange} />);

			// Add second item
			await user.click(addButton);
			expect(onChange).toHaveBeenCalledWith([
				{ key: '', value: '', enabled: true },
				{ key: '', value: '', enabled: true }
			]);
		});

		it('should preserve existing items when adding new item', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const existingItems: KeyValueItem[] = [
				{ key: 'existing', value: 'data', enabled: true }
			];

			render(<KeyValueEditor items={existingItems} onChange={onChange} />);

			const addButton = screen.getByRole('button', { name: /add/i });
			await user.click(addButton);

			expect(onChange).toHaveBeenCalledWith([
				{ key: 'existing', value: 'data', enabled: true },
				{ key: '', value: '', enabled: true }
			]);
		});
	});

	describe('editing items', () => {
		it('should update key when key input changes', async () => {
			const user = userEvent.setup();
			let currentItems: KeyValueItem[] = [
				{ key: '', value: '', enabled: true }
			];
			const onChange = vi.fn((newItems: KeyValueItem[]) => {
				currentItems = newItems;
			});

			const { rerender } = render(<KeyValueEditor items={currentItems} onChange={onChange} />);

			const keyInput = screen.getAllByRole('textbox')[0];

			// Type one character at a time and rerender to simulate controlled component
			for (const char of 'Authorization') {
				await user.type(keyInput, char);
				rerender(<KeyValueEditor items={currentItems} onChange={onChange} />);
			}

			expect(currentItems).toEqual([
				{ key: 'Authorization', value: '', enabled: true }
			]);
		});

		it('should update value when value input changes', async () => {
			const user = userEvent.setup();
			let currentItems: KeyValueItem[] = [
				{ key: 'Authorization', value: '', enabled: true }
			];
			const onChange = vi.fn((newItems: KeyValueItem[]) => {
				currentItems = newItems;
			});

			const { rerender } = render(<KeyValueEditor items={currentItems} onChange={onChange} />);

			const valueInput = screen.getAllByRole('textbox')[1];

			// Type one character at a time and rerender to simulate controlled component
			for (const char of 'Bearer token123') {
				await user.type(valueInput, char);
				rerender(<KeyValueEditor items={currentItems} onChange={onChange} />);
			}

			expect(currentItems).toEqual([
				{ key: 'Authorization', value: 'Bearer token123', enabled: true }
			]);
		});

		it('should update specific item without affecting others', async () => {
			const user = userEvent.setup();
			let currentItems: KeyValueItem[] = [
				{ key: 'Header1', value: 'Value1', enabled: true },
				{ key: 'Header2', value: 'Value2', enabled: true },
				{ key: 'Header3', value: 'Value3', enabled: true }
			];
			const onChange = vi.fn((newItems: KeyValueItem[]) => {
				currentItems = newItems;
			});

			const { rerender } = render(<KeyValueEditor items={currentItems} onChange={onChange} />);

			// Edit second item's key
			const keyInputs = screen.getAllByRole('textbox').filter((_, i) => i % 2 === 0);
			await user.clear(keyInputs[1]);
			rerender(<KeyValueEditor items={currentItems} onChange={onChange} />);

			for (const char of 'Modified') {
				await user.type(keyInputs[1], char);
				rerender(<KeyValueEditor items={currentItems} onChange={onChange} />);
			}

			expect(currentItems).toEqual([
				{ key: 'Header1', value: 'Value1', enabled: true },
				{ key: 'Modified', value: 'Value2', enabled: true },
				{ key: 'Header3', value: 'Value3', enabled: true }
			]);
		});

		it('should toggle enabled state', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'Test', value: 'Value', enabled: true }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			const checkbox = screen.getByRole('checkbox');
			await user.click(checkbox);

			expect(onChange).toHaveBeenCalledWith([
				{ key: 'Test', value: 'Value', enabled: false }
			]);
		});

		it('should toggle multiple checkboxes independently', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'Header1', value: 'Value1', enabled: true },
				{ key: 'Header2', value: 'Value2', enabled: true }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			const checkboxes = screen.getAllByRole('checkbox');

			// Toggle first checkbox
			await user.click(checkboxes[0]);
			expect(onChange).toHaveBeenLastCalledWith([
				{ key: 'Header1', value: 'Value1', enabled: false },
				{ key: 'Header2', value: 'Value2', enabled: true }
			]);

			// Toggle second checkbox
			await user.click(checkboxes[1]);
			expect(onChange).toHaveBeenLastCalledWith([
				{ key: 'Header1', value: 'Value1', enabled: true },
				{ key: 'Header2', value: 'Value2', enabled: false }
			]);
		});
	});

	describe('deleting items', () => {
		it('should delete item when delete button is clicked', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'ToDelete', value: 'Value', enabled: true }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			const deleteButton = screen.getByRole('button', { name: '×' });
			await user.click(deleteButton);

			expect(onChange).toHaveBeenCalledWith([]);
		});

		it('should delete correct item from multiple items', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'Header1', value: 'Value1', enabled: true },
				{ key: 'Header2', value: 'Value2', enabled: true },
				{ key: 'Header3', value: 'Value3', enabled: true }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			// Delete second item
			const deleteButtons = screen.getAllByRole('button', { name: '×' });
			await user.click(deleteButtons[1]);

			expect(onChange).toHaveBeenCalledWith([
				{ key: 'Header1', value: 'Value1', enabled: true },
				{ key: 'Header3', value: 'Value3', enabled: true }
			]);
		});

		it('should delete multiple items sequentially', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'Header1', value: 'Value1', enabled: true },
				{ key: 'Header2', value: 'Value2', enabled: true }
			];

			const { rerender } = render(<KeyValueEditor items={items} onChange={onChange} />);

			// Delete first item
			let deleteButtons = screen.getAllByRole('button', { name: '×' });
			await user.click(deleteButtons[0]);

			expect(onChange).toHaveBeenCalledWith([
				{ key: 'Header2', value: 'Value2', enabled: true }
			]);

			// Rerender with updated items
			rerender(
				<KeyValueEditor
					items={[{ key: 'Header2', value: 'Value2', enabled: true }]}
					onChange={onChange}
				/>
			);

			// Delete second item
			deleteButtons = screen.getAllByRole('button', { name: '×' });
			await user.click(deleteButtons[0]);

			expect(onChange).toHaveBeenLastCalledWith([]);
		});
	});

	describe('controlled component behavior', () => {
		it('should update display when items prop changes', () => {
			const onChange = vi.fn();
			const { rerender } = render(
				<KeyValueEditor items={[]} onChange={onChange} />
			);

			expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

			const newItems: KeyValueItem[] = [
				{ key: 'New', value: 'Item', enabled: true }
			];

			rerender(<KeyValueEditor items={newItems} onChange={onChange} />);

			expect(screen.getByDisplayValue('New')).toBeInTheDocument();
			expect(screen.getByDisplayValue('Item')).toBeInTheDocument();
		});

		it('should not call onChange on initial render', () => {
			const onChange = vi.fn();
			render(
				<KeyValueEditor
					items={[{ key: 'Test', value: 'Value', enabled: true }]}
					onChange={onChange}
				/>
			);

			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('accessibility', () => {
		it('should have accessible delete buttons', () => {
			const onChange = vi.fn();
			render(
				<KeyValueEditor
					items={[{ key: 'Test', value: 'Value', enabled: true }]}
					onChange={onChange}
				/>
			);

			const deleteButton = screen.getByRole('button', { name: '×' });
			expect(deleteButton).toHaveAttribute('title', 'Delete');
		});

		it('should support keyboard navigation', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<KeyValueEditor
					items={[{ key: '', value: '', enabled: true }]}
					onChange={onChange}
				/>
			);

			// Tab through inputs
			await user.tab(); // Focus checkbox
			await user.tab(); // Focus key input
			await user.tab(); // Focus value input
			await user.tab(); // Focus delete button
			await user.tab(); // Focus add button

			const addButton = screen.getByRole('button', { name: /add/i });
			expect(addButton).toHaveFocus();
		});
	});

	describe('edge cases', () => {
		it('should handle rapid add/delete operations', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const { rerender } = render(<KeyValueEditor items={[]} onChange={onChange} />);

			const addButton = screen.getByRole('button', { name: /add/i });

			// Add item
			await user.click(addButton);
			rerender(
				<KeyValueEditor items={[{ key: '', value: '', enabled: true }]} onChange={onChange} />
			);

			// Delete item immediately
			const deleteButton = screen.getByRole('button', { name: '×' });
			await user.click(deleteButton);

			expect(onChange).toHaveBeenCalledTimes(2);
			expect(onChange).toHaveBeenLastCalledWith([]);
		});

		it('should handle empty string values', async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const items: KeyValueItem[] = [
				{ key: 'EmptyValue', value: 'test', enabled: true }
			];

			render(<KeyValueEditor items={items} onChange={onChange} />);

			const valueInput = screen.getAllByRole('textbox')[1];
			await user.clear(valueInput);

			expect(onChange).toHaveBeenLastCalledWith([
				{ key: 'EmptyValue', value: '', enabled: true }
			]);
		});

		it('should handle special characters in key/value', async () => {
			const user = userEvent.setup();
			let currentItems: KeyValueItem[] = [
				{ key: '', value: '', enabled: true }
			];
			const onChange = vi.fn((newItems: KeyValueItem[]) => {
				currentItems = newItems;
			});

			const { rerender } = render(<KeyValueEditor items={currentItems} onChange={onChange} />);

			const [keyInput, valueInput] = screen.getAllByRole('textbox');

			// Type special characters one at a time
			for (const char of 'X-API-Key!@#$%') {
				await user.type(keyInput, char);
				rerender(<KeyValueEditor items={currentItems} onChange={onChange} />);
			}

			for (const char of 'token<>') {
				await user.type(valueInput, char);
				rerender(<KeyValueEditor items={currentItems} onChange={onChange} />);
			}

			expect(currentItems[0].key).toBe('X-API-Key!@#$%');
			expect(currentItems[0].value).toBe('token<>');
		});
	});
});
