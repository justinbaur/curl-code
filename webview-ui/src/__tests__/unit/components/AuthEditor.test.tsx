import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthEditor } from '../../../components/RequestBuilder/AuthEditor';
import type { HttpAuth } from '../../../vscode';

describe('AuthEditor', () => {
	describe('auth type selector', () => {
		it('should render auth type selector with all options', () => {
			const auth: HttpAuth = { type: 'none' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const select = screen.getByRole('combobox');
			expect(select).toHaveValue('none');

			expect(screen.getByRole('option', { name: 'No Auth' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Basic Auth' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Bearer Token' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'API Key' })).toBeInTheDocument();
		});

		it('should call onChange when auth type changes', async () => {
			const auth: HttpAuth = { type: 'none' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'basic');

			expect(onChange).toHaveBeenCalledWith({ type: 'basic' });
		});

		it('should change from none to bearer', async () => {
			const auth: HttpAuth = { type: 'none' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'bearer');

			expect(onChange).toHaveBeenCalledWith({ type: 'bearer' });
		});

		it('should change from none to api-key', async () => {
			const auth: HttpAuth = { type: 'none' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'api-key');

			expect(onChange).toHaveBeenCalledWith({ type: 'api-key' });
		});
	});

	describe('no auth', () => {
		it('should not render any auth fields when type is none', () => {
			const auth: HttpAuth = { type: 'none' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
			expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
			expect(screen.queryByLabelText('Token')).not.toBeInTheDocument();
			expect(screen.queryByLabelText('Key Name')).not.toBeInTheDocument();
		});
	});

	describe('basic auth', () => {
		it('should render username and password fields', () => {
			const auth: HttpAuth = { type: 'basic', username: 'testuser', password: 'secret' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			expect(screen.getByLabelText('Username')).toBeInTheDocument();
			expect(screen.getByLabelText('Password')).toBeInTheDocument();
		});

		it('should display username value', () => {
			const auth: HttpAuth = { type: 'basic', username: 'testuser', password: '' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const usernameInput = screen.getByLabelText('Username');
			expect(usernameInput).toHaveValue('testuser');
		});

		it('should display password value (masked)', () => {
			const auth: HttpAuth = { type: 'basic', username: '', password: 'secret123' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const passwordInput = screen.getByLabelText('Password');
			expect(passwordInput).toHaveValue('secret123');
			expect(passwordInput).toHaveAttribute('type', 'password');
		});

		it('should call onChange when username changes', async () => {
			const auth: HttpAuth = { type: 'basic', username: '', password: '' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const usernameInput = screen.getByLabelText('Username');
			await user.click(usernameInput);
			await user.paste('newuser');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'basic',
				username: 'newuser',
				password: ''
			});
		});

		it('should call onChange when password changes', async () => {
			const auth: HttpAuth = { type: 'basic', username: 'testuser', password: '' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const passwordInput = screen.getByLabelText('Password');
			await user.click(passwordInput);
			await user.paste('secret');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'basic',
				username: 'testuser',
				password: 'secret'
			});
		});

		it('should handle empty username and password', () => {
			const auth: HttpAuth = { type: 'basic' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const usernameInput = screen.getByLabelText('Username');
			const passwordInput = screen.getByLabelText('Password');

			expect(usernameInput).toHaveValue('');
			expect(passwordInput).toHaveValue('');
		});

		it('should show placeholder text', () => {
			const auth: HttpAuth = { type: 'basic' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
		});
	});

	describe('bearer token', () => {
		it('should render token field', () => {
			const auth: HttpAuth = { type: 'bearer', token: 'abc123' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			expect(screen.getByLabelText('Token')).toBeInTheDocument();
		});

		it('should display token value', () => {
			const auth: HttpAuth = { type: 'bearer', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const tokenInput = screen.getByLabelText('Token');
			expect(tokenInput).toHaveValue('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
		});

		it('should call onChange when token changes', async () => {
			const auth: HttpAuth = { type: 'bearer', token: '' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const tokenInput = screen.getByLabelText('Token');
			await user.click(tokenInput);
			await user.paste('newtoken');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'bearer',
				token: 'newtoken'
			});
		});

		it('should handle empty token', () => {
			const auth: HttpAuth = { type: 'bearer' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const tokenInput = screen.getByLabelText('Token');
			expect(tokenInput).toHaveValue('');
		});

		it('should show placeholder text', () => {
			const auth: HttpAuth = { type: 'bearer' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			expect(screen.getByPlaceholderText('Bearer token')).toBeInTheDocument();
		});

		it('should use monospace font for token', () => {
			const auth: HttpAuth = { type: 'bearer', token: 'abc123' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const tokenInput = screen.getByLabelText('Token');
			expect(tokenInput).toHaveStyle({ fontFamily: 'var(--font-mono)' });
		});
	});

	describe('api key', () => {
		it('should render all API key fields', () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyName: 'X-API-Key',
				apiKeyValue: 'secret',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			expect(screen.getByLabelText('Key Name')).toBeInTheDocument();
			expect(screen.getByLabelText('Key Value')).toBeInTheDocument();
			expect(screen.getByLabelText('Add to')).toBeInTheDocument();
		});

		it('should display API key name', () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyName: 'X-Custom-Key',
				apiKeyValue: '',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const keyNameInput = screen.getByLabelText('Key Name');
			expect(keyNameInput).toHaveValue('X-Custom-Key');
		});

		it('should display API key value (masked)', () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyName: '',
				apiKeyValue: 'secret123',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const keyValueInput = screen.getByLabelText('Key Value');
			expect(keyValueInput).toHaveValue('secret123');
			expect(keyValueInput).toHaveAttribute('type', 'password');
		});

		it('should call onChange when key name changes', async () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyName: '',
				apiKeyValue: '',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const keyNameInput = screen.getByLabelText('Key Name');
			await user.click(keyNameInput);
			await user.paste('X-API-Key');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'api-key',
				apiKeyName: 'X-API-Key',
				apiKeyValue: '',
				apiKeyLocation: 'header'
			});
		});

		it('should call onChange when key value changes', async () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyName: 'X-API-Key',
				apiKeyValue: '',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const keyValueInput = screen.getByLabelText('Key Value');
			await user.click(keyValueInput);
			await user.paste('secret');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'api-key',
				apiKeyName: 'X-API-Key',
				apiKeyValue: 'secret',
				apiKeyLocation: 'header'
			});
		});

		it('should render location selector with header and query options', () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const locationSelect = screen.getByLabelText('Add to');
			expect(screen.getByRole('option', { name: 'Header' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'Query Params' })).toBeInTheDocument();
		});

		it('should default to header location', () => {
			const auth: HttpAuth = { type: 'api-key' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const locationSelect = screen.getByLabelText('Add to');
			expect(locationSelect).toHaveValue('header');
		});

		it('should call onChange when location changes to query', async () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyName: 'api_key',
				apiKeyValue: 'secret',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const locationSelect = screen.getByLabelText('Add to');
			await user.selectOptions(locationSelect, 'query');

			expect(onChange).toHaveBeenCalledWith({
				type: 'api-key',
				apiKeyName: 'api_key',
				apiKeyValue: 'secret',
				apiKeyLocation: 'query'
			});
		});

		it('should handle empty API key fields', () => {
			const auth: HttpAuth = { type: 'api-key' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const keyNameInput = screen.getByLabelText('Key Name');
			const keyValueInput = screen.getByLabelText('Key Value');

			expect(keyNameInput).toHaveValue('');
			expect(keyValueInput).toHaveValue('');
		});

		it('should show placeholder text', () => {
			const auth: HttpAuth = { type: 'api-key' };
			const onChange = vi.fn();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			expect(screen.getByPlaceholderText('X-API-Key')).toBeInTheDocument();
			expect(screen.getByPlaceholderText('API key value')).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should handle switching from basic to bearer', async () => {
			const auth: HttpAuth = { type: 'basic', username: 'user', password: 'pass' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			const { rerender } = render(<AuthEditor auth={auth} onChange={onChange} />);

			// Verify basic auth fields exist
			expect(screen.getByLabelText('Username')).toBeInTheDocument();

			// Switch to bearer
			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'bearer');

			// Rerender with new auth type
			rerender(<AuthEditor auth={{ type: 'bearer' }} onChange={onChange} />);

			// Verify bearer field exists and basic fields don't
			expect(screen.getByLabelText('Token')).toBeInTheDocument();
			expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
		});

		it('should handle switching from bearer to api-key', async () => {
			const auth: HttpAuth = { type: 'bearer', token: 'abc123' };
			const onChange = vi.fn();
			const user = userEvent.setup();
			const { rerender } = render(<AuthEditor auth={auth} onChange={onChange} />);

			// Verify bearer field exists
			expect(screen.getByLabelText('Token')).toBeInTheDocument();

			// Switch to api-key
			const select = screen.getByRole('combobox');
			await user.selectOptions(select, 'api-key');

			// Rerender with new auth type
			rerender(<AuthEditor auth={{ type: 'api-key' }} onChange={onChange} />);

			// Verify api-key fields exist and bearer field doesn't
			expect(screen.getByLabelText('Key Name')).toBeInTheDocument();
			expect(screen.queryByLabelText('Token')).not.toBeInTheDocument();
		});

		it('should preserve other auth fields when changing a single field', async () => {
			const auth: HttpAuth = {
				type: 'api-key',
				apiKeyName: 'X-API-Key',
				apiKeyValue: 'secret',
				apiKeyLocation: 'header'
			};
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AuthEditor auth={auth} onChange={onChange} />);

			const keyNameInput = screen.getByLabelText('Key Name');
			await user.click(keyNameInput);
			// Select all text before pasting to replace it
			await user.keyboard('{Control>}a{/Control}');
			await user.paste('X-Custom-Key');

			expect(onChange).toHaveBeenLastCalledWith({
				type: 'api-key',
				apiKeyName: 'X-Custom-Key',
				apiKeyValue: 'secret',
				apiKeyLocation: 'header'
			});
		});
	});
});
