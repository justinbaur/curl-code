import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UrlBar } from '../../../components/RequestBuilder/UrlBar';

describe('UrlBar', () => {
	describe('rendering', () => {
		it('should render with empty value', () => {
			const onChange = vi.fn();
			render(<UrlBar value="" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toBeInTheDocument();
			expect(input).toHaveValue('');
		});

		it('should render with initial value', () => {
			const onChange = vi.fn();
			render(<UrlBar value="https://api.example.com/users" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveValue('https://api.example.com/users');
		});

		it('should display placeholder text', () => {
			const onChange = vi.fn();
			render(<UrlBar value="" onChange={onChange} />);

			expect(screen.getByPlaceholderText('Enter request URL')).toBeInTheDocument();
		});

		it('should have correct input type', () => {
			const onChange = vi.fn();
			render(<UrlBar value="" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveAttribute('type', 'text');
		});

		it('should apply url-input CSS class', () => {
			const onChange = vi.fn();
			render(<UrlBar value="" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveClass('url-input');
		});

		it('should disable spellCheck', () => {
			const onChange = vi.fn();
			render(<UrlBar value="" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveAttribute('spellcheck', 'false');
		});

		it('should disable autoComplete', () => {
			const onChange = vi.fn();
			render(<UrlBar value="" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveAttribute('autocomplete', 'off');
		});
	});

	describe('user interactions', () => {
		it('should call onChange when user types', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();

			// Create a wrapper to handle controlled component state
			function ControlledUrlBar() {
				const [value, setValue] = React.useState('');
				return <UrlBar value={value} onChange={(v) => { setValue(v); onChange(v); }} />;
			}

			render(<ControlledUrlBar />);

			const input = screen.getByPlaceholderText('Enter request URL');
			await user.type(input, 'https://api.example.com');

			expect(onChange).toHaveBeenCalledTimes(23); // Each character typed
			expect(onChange).toHaveBeenLastCalledWith('https://api.example.com');
		});

		it('should call onChange with updated value when input changes', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();

			// Create a wrapper to handle controlled component state
			function ControlledUrlBar() {
				const [value, setValue] = React.useState('https://api.example.com');
				return <UrlBar value={value} onChange={(v) => { setValue(v); onChange(v); }} />;
			}

			render(<ControlledUrlBar />);

			const input = screen.getByPlaceholderText('Enter request URL');
			await user.clear(input);
			await user.type(input, 'https://new-url.com');

			expect(onChange).toHaveBeenCalledWith('https://new-url.com');
		});

		it('should call onKeyDown when key is pressed', async () => {
			const onChange = vi.fn();
			const onKeyDown = vi.fn();
			const user = userEvent.setup();
			render(<UrlBar value="" onChange={onChange} onKeyDown={onKeyDown} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			await user.type(input, '{Enter}');

			expect(onKeyDown).toHaveBeenCalledTimes(1);
			expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({
				key: 'Enter'
			}));
		});

		it('should call onKeyDown on Ctrl+Enter', async () => {
			const onChange = vi.fn();
			const onKeyDown = vi.fn();
			const user = userEvent.setup();
			render(<UrlBar value="" onChange={onChange} onKeyDown={onKeyDown} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			await user.type(input, '{Control>}{Enter}{/Control}');

			expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({
				key: 'Enter',
				ctrlKey: true
			}));
		});

		it('should not call onKeyDown when prop is undefined', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<UrlBar value="" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');

			// Should not throw error when onKeyDown is undefined
			await expect(user.type(input, '{Enter}')).resolves.not.toThrow();
		});

		it('should update controlled value when prop changes', () => {
			const onChange = vi.fn();
			const { rerender } = render(<UrlBar value="https://api.example.com" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveValue('https://api.example.com');

			rerender(<UrlBar value="https://new-api.com" onChange={onChange} />);
			expect(input).toHaveValue('https://new-api.com');
		});
	});

	describe('edge cases', () => {
		it('should handle empty string value', () => {
			const onChange = vi.fn();
			render(<UrlBar value="" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveValue('');
		});

		it('should handle long URLs', () => {
			const onChange = vi.fn();
			const longUrl = 'https://api.example.com/v1/users/12345/posts/67890/comments?page=1&limit=50&sort=desc&filter=active';
			render(<UrlBar value={longUrl} onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveValue(longUrl);
		});

		it('should handle special characters in URL', () => {
			const onChange = vi.fn();
			const urlWithSpecialChars = 'https://api.example.com/search?q=hello%20world&tags=foo,bar';
			render(<UrlBar value={urlWithSpecialChars} onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveValue(urlWithSpecialChars);
		});

		it('should handle non-URL strings', () => {
			const onChange = vi.fn();
			render(<UrlBar value="not a url" onChange={onChange} />);

			const input = screen.getByPlaceholderText('Enter request URL');
			expect(input).toHaveValue('not a url');
		});
	});
});
