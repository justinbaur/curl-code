import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BodyEditor } from '../../../components/RequestBuilder/BodyEditor';
import type { HttpBody } from '../../../vscode';

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
		it('should not render textarea when type is none', () => {
			const body: HttpBody = { type: 'none', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		});

		it('should not render format button when type is none', () => {
			const body: HttpBody = { type: 'none', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
		});
	});

	describe('json type', () => {
		it('should render textarea for JSON', () => {
			const body: HttpBody = { type: 'json', content: '{}' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveValue('{}');
		});

		it('should show JSON placeholder', () => {
			const body: HttpBody = { type: 'json', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toHaveAttribute('placeholder', '{\n  "key": "value"\n}');
		});

		it('should render format button for JSON', () => {
			const body: HttpBody = { type: 'json', content: '{}' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			expect(formatButton).toBeInTheDocument();
		});

		it('should call onChange when content changes', async () => {
			const body: HttpBody = { type: 'json', content: '' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			// Use paste instead of type to avoid issues with special characters like braces
			await user.click(textarea);
			await user.paste('{"key":"value"}');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'json',
				content: '{"key":"value"}'
			});
		});

		it('should format valid JSON when format button is clicked', async () => {
			const body: HttpBody = { type: 'json', content: '{"name":"test","value":123}' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			expect(onChange).toHaveBeenCalledWith({
				type: 'json',
				content: '{\n  "name": "test",\n  "value": 123\n}'
			});
		});

		it('should not modify content when formatting invalid JSON', async () => {
			const body: HttpBody = { type: 'json', content: '{invalid json}' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			expect(onChange).not.toHaveBeenCalled();
		});

		it('should handle nested JSON formatting', async () => {
			const body: HttpBody = {
				type: 'json',
				content: '{"user":{"name":"John","age":30},"items":["a","b"]}'
			};
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			const expectedFormatted = JSON.stringify(
				{ user: { name: 'John', age: 30 }, items: ['a', 'b'] },
				null,
				2
			);

			expect(onChange).toHaveBeenCalledWith({
				type: 'json',
				content: expectedFormatted
			});
		});

		it('should disable spellCheck for JSON textarea', () => {
			const body: HttpBody = { type: 'json', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toHaveAttribute('spellcheck', 'false');
		});
	});

	describe('raw type', () => {
		it('should render textarea for raw', () => {
			const body: HttpBody = { type: 'raw', content: 'raw text' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveValue('raw text');
		});

		it('should show raw placeholder', () => {
			const body: HttpBody = { type: 'raw', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.getByPlaceholderText('Enter request body')).toBeInTheDocument();
		});

		it('should not render format button for raw', () => {
			const body: HttpBody = { type: 'raw', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
		});

		it('should call onChange when raw content changes', async () => {
			const body: HttpBody = { type: 'raw', content: '' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			await user.click(textarea);
			await user.paste('new content');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'raw',
				content: 'new content'
			});
		});
	});

	describe('x-www-form-urlencoded type', () => {
		it('should render textarea for form-urlencoded', () => {
			const body: HttpBody = { type: 'x-www-form-urlencoded', content: 'key=value' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveValue('key=value');
		});

		it('should show form-urlencoded placeholder', () => {
			const body: HttpBody = { type: 'x-www-form-urlencoded', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.getByPlaceholderText('key=value&key2=value2')).toBeInTheDocument();
		});

		it('should not render format button for form-urlencoded', () => {
			const body: HttpBody = { type: 'x-www-form-urlencoded', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument();
		});

		it('should call onChange when form-urlencoded content changes', async () => {
			const body: HttpBody = { type: 'x-www-form-urlencoded', content: '' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			await user.click(textarea);
			await user.paste('foo=bar&baz=qux');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'x-www-form-urlencoded',
				content: 'foo=bar&baz=qux'
			});
		});
	});

	describe('form-data type', () => {
		it('should not render textarea for form-data', () => {
			const body: HttpBody = { type: 'form-data', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
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
			// Verify content is preserved
			expect(screen.getByRole('textbox')).toHaveValue('{"test": true}');
		});

		it('should handle switching from raw to form-data', async () => {
			const body: HttpBody = { type: 'raw', content: 'test' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			const { rerender } = render(<BodyEditor body={body} onChange={onChange} />);

			// Verify textarea exists for raw
			expect(screen.getByRole('textbox')).toBeInTheDocument();

			// Switch to form-data
			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'form-data');

			// Rerender with new type
			rerender(<BodyEditor body={{ type: 'form-data', content: 'test' }} onChange={onChange} />);

			// Verify textarea is gone and notice is shown
			expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
			expect(screen.getByText(/form data editing is not yet supported/i)).toBeInTheDocument();
		});

		it('should handle empty content', () => {
			const body: HttpBody = { type: 'json', content: '' };
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toHaveValue('');
		});

		it('should handle multiline content', () => {
			const body: HttpBody = {
				type: 'raw',
				content: 'Line 1\nLine 2\nLine 3'
			};
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3');
		});

		it('should handle special characters in content', () => {
			const body: HttpBody = {
				type: 'raw',
				content: '<html>\n\t&nbsp;\n</html>'
			};
			const onChange = vi.fn();
			render(<BodyEditor body={body} onChange={onChange} />);

			const textarea = screen.getByRole('textbox');
			expect(textarea).toHaveValue('<html>\n\t&nbsp;\n</html>');
		});

		it('should format JSON with special characters', async () => {
			const body: HttpBody = {
				type: 'json',
				content: '{"message":"Hello\\nWorld","emoji":"\\u2764\\uFE0F"}'
			};
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			expect(onChange).toHaveBeenCalledWith({
				type: 'json',
				content: expect.stringContaining('"message"')
			});
		});

		it('should handle empty JSON object formatting', async () => {
			const body: HttpBody = { type: 'json', content: '{}' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			expect(onChange).toHaveBeenCalledWith({
				type: 'json',
				content: '{}'
			});
		});

		it('should handle empty JSON array formatting', async () => {
			const body: HttpBody = { type: 'json', content: '[]' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<BodyEditor body={body} onChange={onChange} />);

			const formatButton = screen.getByRole('button', { name: /format/i });
			await user.click(formatButton);

			expect(onChange).toHaveBeenCalledWith({
				type: 'json',
				content: '[]'
			});
		});
	});
});
