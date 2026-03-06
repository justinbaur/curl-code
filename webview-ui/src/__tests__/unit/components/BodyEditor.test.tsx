import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BodyEditor } from '../../../components/RequestBuilder/BodyEditor';
import type { HttpBody } from '../../../vscode';

// Mock Monaco Editor — it doesn't render in jsdom
let mockOnChange: ((value: string | undefined) => void) | undefined;
let mockOnMount: ((editor: unknown) => void) | undefined;

vi.mock('@monaco-editor/react', () => ({
	default: ({ value, onChange, onMount, language }: {
		value: string;
		onChange: (value: string | undefined) => void;
		onMount: (editor: unknown) => void;
		language: string;
	}) => {
		mockOnChange = onChange;
		mockOnMount = onMount;
		return (
			<div data-testid="monaco-editor" data-language={language} data-value={value}>
				Monaco Editor
			</div>
		);
	},
}));

beforeEach(() => {
	mockOnChange = undefined;
	mockOnMount = undefined;
});

describe('BodyEditor', () => {
	describe('body type selector', () => {
		it('should render body type selector with all options', () => {
			const body: HttpBody = { type: 'none', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const select = screen.getByRole('combobox');
			expect(select).toHaveValue('none');

			expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'JSON' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Raw' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Form URL Encoded' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Form Data' })).toBeInTheDocument();
		});

		it('should call onChange when body type changes', async () => {
			const body: HttpBody = { type: 'none', content: '' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'json');

			expect(onChange).toHaveBeenCalledWith({ type: 'json', content: '' });
		});

		it('should preserve content when changing type', async () => {
			const body: HttpBody = { type: 'raw', content: 'test content' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'json');

			expect(onChange).toHaveBeenCalledWith({ type: 'json', content: 'test content' });
		});
	});

	describe('none type', () => {
		it('should not render editor when type is none', () => {
			const body: HttpBody = { type: 'none', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
		});

		it('should not render format button when type is none', () => {
			const body: HttpBody = { type: 'none', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
		});
	});

	describe('json type', () => {
		it('should render Monaco editor for JSON', () => {
			const body: HttpBody = { type: 'json', content: '{}' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const editor = screen.getByTestId('monaco-editor');
			expect(editor).toBeInTheDocument();
			expect(editor).toHaveAttribute('data-language', 'json');
			expect(editor).toHaveAttribute('data-value', '{}');
		});

		it('should render format button for JSON', () => {
			const body: HttpBody = { type: 'json', content: '{}' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			expect(formatButton).toBeInTheDocument();
		});

		it('should call onChange when content changes via Monaco', () => {
			const body: HttpBody = { type: 'json', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			// Simulate Monaco onChange
			mockOnChange?.('{"key":"value"}');

			expect(onChange).toHaveBeenCalledWith({
				type: 'json',
				content: '{"key":"value"}'
			});
		});

		it('should call format action when format button is clicked', async () => {
			const body: HttpBody = { type: 'json', content: '{"name":"test"}' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			// Simulate Monaco mount with a mock editor
			const mockRun = vi.fn();
			const mockEditor = {
				getAction: vi.fn().mockReturnValue({ run: mockRun }),
			};
			mockOnMount?.(mockEditor);

			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			expect(mockEditor.getAction).toHaveBeenCalledWith('editor.action.formatDocument');
			expect(mockRun).toHaveBeenCalled();
		});

		it('should not modify content when formatting invalid JSON', async () => {
			const body: HttpBody = { type: 'json', content: '{invalid json}' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			// No editor mounted, so format should be a no-op
			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('raw type', () => {
		it('should render Monaco editor for raw', () => {
			const body: HttpBody = { type: 'raw', content: 'raw text' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const editor = screen.getByTestId('monaco-editor');
			expect(editor).toBeInTheDocument();
			expect(editor).toHaveAttribute('data-language', 'plaintext');
			expect(editor).toHaveAttribute('data-value', 'raw text');
		});

		it('should not render format button for raw', () => {
			const body: HttpBody = { type: 'raw', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
		});

		it('should call onChange when raw content changes', () => {
			const body: HttpBody = { type: 'raw', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			mockOnChange?.('new content');

			expect(onChange).toHaveBeenCalledWith({
				type: 'raw',
				content: 'new content'
			});
		});
	});

	describe('x-www-form-urlencoded type', () => {
		it('should render Monaco editor for form-urlencoded', () => {
			const body: HttpBody = { type: 'x-www-form-urlencoded', content: 'key=value' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const editor = screen.getByTestId('monaco-editor');
			expect(editor).toBeInTheDocument();
			expect(editor).toHaveAttribute('data-language', 'plaintext');
			expect(editor).toHaveAttribute('data-value', 'key=value');
		});

		it('should not render format button for form-urlencoded', () => {
			const body: HttpBody = { type: 'x-www-form-urlencoded', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
		});

		it('should call onChange when form-urlencoded content changes', () => {
			const body: HttpBody = { type: 'x-www-form-urlencoded', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			mockOnChange?.('foo=bar&baz=qux');

			expect(onChange).toHaveBeenCalledWith({
				type: 'x-www-form-urlencoded',
				content: 'foo=bar&baz=qux'
			});
		});
	});

	describe('form-data type', () => {
		it('should not render editor for form-data', () => {
			const body: HttpBody = { type: 'form-data', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
		});

		it('should show form-data notice message', () => {
			const body: HttpBody = { type: 'form-data', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(
				screen.getByText(/form data editing is not yet supported in the ui/i)
			).toBeInTheDocument();
		});

		it('should suggest using JSON or Raw as alternatives', () => {
			const body: HttpBody = { type: 'form-data', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(
				screen.getByText(/you can use the json or raw body types for now/i)
			).toBeInTheDocument();
		});

		it('should not render format button for form-data', () => {
			const body: HttpBody = { type: 'form-data', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should handle switching from json to raw', async () => {
			const body: HttpBody = { type: 'json', content: '{"test": true}' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			const { rerender } = render(<BodyEditor body={body} onChange={onChange} />);

			// Verify format button exists for JSON
			expect(screen.getByRole('button', { name: /format/i })).toBeInTheDocument();

			// Switch to raw
			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'raw');

			// Rerender with new type
			rerender(<BodyEditor body={{ type: 'raw', content: '{"test": true}' }} onChange={onChange} />);

			// Verify format button is gone
			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
			// Verify editor still shows content
			const editor = screen.getByTestId('monaco-editor');
			expect(editor).toHaveAttribute('data-value', '{"test": true}');
		});

		it('should handle switching from raw to form-data', async () => {
			const body: HttpBody = { type: 'raw', content: 'test' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			const { rerender } = render(<BodyEditor body={body} onChange={onChange} />);

			// Verify editor exists for raw
			expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();

			// Switch to form-data
			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'form-data');

			// Rerender with new type
			rerender(<BodyEditor body={{ type: 'form-data', content: 'test' }} onChange={onChange} />);

			// Verify editor is gone and notice is shown
			expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
			expect(screen.getByText(/form data editing is not yet supported/i)).toBeInTheDocument();
		});

		it('should handle empty content', () => {
			const body: HttpBody = { type: 'json', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const editor = screen.getByTestId('monaco-editor');
			expect(editor).toHaveAttribute('data-value', '');
		});

		it('should handle multiline content', () => {
			const body: HttpBody = {
				type: 'raw',
				content: 'Line 1\nLine 2\nLine 3'
			};
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const editor = screen.getByTestId('monaco-editor');
			expect(editor).toHaveAttribute('data-value', 'Line 1\nLine 2\nLine 3');
		});

		it('should handle special characters in content', () => {
			const body: HttpBody = {
				type: 'raw',
				content: '<html>\n\t&nbsp;\n</html>'
			};
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const editor = screen.getByTestId('monaco-editor');
			expect(editor).toHaveAttribute('data-value', '<html>\n\t&nbsp;\n</html>');
		});

		it('should handle onChange with undefined value', () => {
			const body: HttpBody = { type: 'json', content: 'test' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			// Monaco can pass undefined when content is cleared
			mockOnChange?.(undefined);

			expect(onChange).toHaveBeenCalledWith({
				type: 'json',
				content: ''
			});
		});
	});
});
