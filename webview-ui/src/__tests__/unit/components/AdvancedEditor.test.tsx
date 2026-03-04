import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedEditor } from '../../../components/RequestBuilder/AdvancedEditor';
import { createDefaultAdvancedOptions } from '../../../vscode';
import type { AdvancedOptions } from '../../../vscode';

describe('AdvancedEditor', () => {
	const defaultAdvanced = createDefaultAdvancedOptions();

	describe('chip grid layout', () => {
		it('should render all section chips', () => {
			const onChange = vi.fn();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			expect(screen.getByText('HTTP Version')).toBeInTheDocument();
			expect(screen.getByText('Connection')).toBeInTheDocument();
			expect(screen.getByText('Cookies')).toBeInTheDocument();
			expect(screen.getByText('Proxy')).toBeInTheDocument();
			expect(screen.getByText('SSL / TLS')).toBeInTheDocument();
			expect(screen.getByText('Redirects')).toBeInTheDocument();
			expect(screen.getByText('Retry')).toBeInTheDocument();
			expect(screen.getByText('Debug & Compression')).toBeInTheDocument();
			expect(screen.getByText('Auth Extensions')).toBeInTheDocument();
			expect(screen.getByText('DNS / Resolution')).toBeInTheDocument();
			expect(screen.getByText('Rate Limiting')).toBeInTheDocument();
			expect(screen.getByText('Other')).toBeInTheDocument();
		});

		it('should not show any detail pane initially', () => {
			const onChange = vi.fn();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			// No section-specific fields should be visible
			expect(screen.queryByLabelText('Protocol Version')).not.toBeInTheDocument();
			expect(screen.queryByLabelText('Connect Timeout (seconds)')).not.toBeInTheDocument();
		});

		it('should toggle detail pane when clicking a chip twice', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			// Click to open
			await user.click(screen.getByText('Connection'));
			expect(screen.getByLabelText('Connect Timeout (seconds)')).toBeInTheDocument();

			// Click again to close
			await user.click(screen.getByText('Connection'));
			expect(screen.queryByLabelText('Connect Timeout (seconds)')).not.toBeInTheDocument();
		});

		it('should switch detail pane when clicking a different chip', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			// Open Connection
			await user.click(screen.getByText('Connection'));
			expect(screen.getByLabelText('Connect Timeout (seconds)')).toBeInTheDocument();

			// Click Proxy — should switch
			await user.click(screen.getByText('Proxy'));
			expect(screen.queryByLabelText('Connect Timeout (seconds)')).not.toBeInTheDocument();
			expect(screen.getByLabelText('Proxy URL')).toBeInTheDocument();
		});
	});

	describe('HTTP Version section', () => {
		it('should render HTTP version dropdown with all options', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('HTTP Version'));

			const select = screen.getByLabelText('Protocol Version');
			expect(select).toHaveValue('default');

			expect(screen.getByRole('option', { name: 'Default' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'HTTP/2' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'HTTP/3' })).toBeInTheDocument();
		});

		it('should call onChange when HTTP version changes', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('HTTP Version'));
			const select = screen.getByLabelText('Protocol Version');
			await user.selectOptions(select, 'http2');

			expect(onChange).toHaveBeenCalledWith({
				...defaultAdvanced,
				httpVersion: 'http2',
			});
		});
	});

	describe('Connection section', () => {
		it('should render connect timeout input', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Connection'));

			expect(screen.getByLabelText('Connect Timeout (seconds)')).toBeInTheDocument();
		});

		it('should call onChange when connect timeout changes', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Connection'));
			const input = screen.getByLabelText('Connect Timeout (seconds)');
			await user.click(input);
			await user.paste('10');

			expect(onChange).toHaveBeenCalledWith({
				...defaultAdvanced,
				connectTimeout: '10',
			});
		});

		it('should render keepalive toggles', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Connection'));

			expect(screen.getByLabelText('Disable keepalive (--no-keepalive)')).toBeInTheDocument();
			expect(screen.getByLabelText('TCP no delay (--tcp-nodelay)')).toBeInTheDocument();
		});
	});

	describe('Cookies section', () => {
		it('should render cookie and cookie jar inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Cookies'));

			expect(screen.getByLabelText('Cookie (string or file path)')).toBeInTheDocument();
			expect(screen.getByLabelText('Cookie Jar (file path)')).toBeInTheDocument();
		});
	});

	describe('Proxy section', () => {
		it('should render proxy inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Proxy'));

			expect(screen.getByLabelText('Proxy URL')).toBeInTheDocument();
			expect(screen.getByLabelText('Proxy Auth (user:password)')).toBeInTheDocument();
			expect(screen.getByLabelText('No Proxy (comma-separated)')).toBeInTheDocument();
		});
	});

	describe('SSL/TLS section', () => {
		it('should render TLS version dropdown', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('SSL / TLS'));

			const select = screen.getByLabelText('TLS Version');
			expect(select).toHaveValue('default');
		});

		it('should render certificate inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('SSL / TLS'));

			expect(screen.getByLabelText('CA Certificate')).toBeInTheDocument();
			expect(screen.getByLabelText('Client Certificate')).toBeInTheDocument();
			expect(screen.getByLabelText('Client Key')).toBeInTheDocument();
		});
	});

	describe('Redirects section', () => {
		it('should render max-redirs and post toggles', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Redirects'));

			expect(screen.getByLabelText('Max Redirects')).toBeInTheDocument();
			expect(screen.getByLabelText('Send auth to redirected hosts (--location-trusted)')).toBeInTheDocument();
			expect(screen.getByLabelText('Keep POST on 301 redirect (--post301)')).toBeInTheDocument();
			expect(screen.getByLabelText('Keep POST on 302 redirect (--post302)')).toBeInTheDocument();
			expect(screen.getByLabelText('Keep POST on 303 redirect (--post303)')).toBeInTheDocument();
		});
	});

	describe('Retry section', () => {
		it('should render retry inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Retry'));

			expect(screen.getByLabelText('Retry Count')).toBeInTheDocument();
			expect(screen.getByLabelText('Retry Delay (seconds)')).toBeInTheDocument();
			expect(screen.getByLabelText('Retry Max Time (seconds)')).toBeInTheDocument();
		});
	});

	describe('Debug & Compression section', () => {
		it('should render compressed and verbose toggles', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Debug & Compression'));

			expect(screen.getByLabelText('Auto-decompress response (--compressed)')).toBeInTheDocument();
			expect(screen.getByLabelText('Verbose output (--verbose)')).toBeInTheDocument();
		});

		it('should call onChange when compressed toggle changes', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Debug & Compression'));
			await user.click(screen.getByLabelText('Auto-decompress response (--compressed)'));

			expect(onChange).toHaveBeenCalledWith({
				...defaultAdvanced,
				compressed: true,
			});
		});
	});

	describe('Auth Extensions section', () => {
		it('should render auth extension toggles and inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Auth Extensions'));

			expect(screen.getByLabelText('Digest authentication (--digest)')).toBeInTheDocument();
			expect(screen.getByLabelText('NTLM authentication (--ntlm)')).toBeInTheDocument();
			expect(screen.getByLabelText('Negotiate / SPNEGO (--negotiate)')).toBeInTheDocument();
			expect(screen.getByLabelText('AWS Sigv4 Provider')).toBeInTheDocument();
			expect(screen.getByLabelText('OAuth2 Bearer Token')).toBeInTheDocument();
		});
	});

	describe('DNS / Resolution section', () => {
		it('should render resolve and connect-to inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('DNS / Resolution'));

			expect(screen.getByLabelText('Resolve (host:port:addr)')).toBeInTheDocument();
			expect(screen.getByLabelText('Connect-to (host1:port1:host2:port2)')).toBeInTheDocument();
		});
	});

	describe('Rate Limiting section', () => {
		it('should render rate limiting inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Rate Limiting'));

			expect(screen.getByLabelText('Limit Rate')).toBeInTheDocument();
			expect(screen.getByLabelText('Max Filesize (bytes)')).toBeInTheDocument();
		});
	});

	describe('Other section', () => {
		it('should render user-agent and referer inputs', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			await user.click(screen.getByText('Other'));

			expect(screen.getByLabelText('User-Agent')).toBeInTheDocument();
			expect(screen.getByLabelText('Referer URL')).toBeInTheDocument();
		});
	});

	describe('Custom Flags section', () => {
		it('should render raw flags textarea (always visible)', () => {
			const onChange = vi.fn();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			// Custom Flags is always visible without clicking any chip
			expect(screen.getByLabelText('Additional cURL Flags')).toBeInTheDocument();
		});

		it('should call onChange when raw flags change', async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			const textarea = screen.getByLabelText('Additional cURL Flags');
			await user.click(textarea);
			await user.paste('--verbose');

			expect(onChange).toHaveBeenCalledWith({
				...defaultAdvanced,
				rawFlags: '--verbose',
			});
		});

		it('should show help text', () => {
			const onChange = vi.fn();
			render(<AdvancedEditor advanced={defaultAdvanced} onChange={onChange} />);

			expect(screen.getByText(/Enter additional cURL flags/)).toBeInTheDocument();
		});
	});

	describe('edge cases', () => {
		it('should preserve other fields when changing one field', async () => {
			const advanced: AdvancedOptions = {
				...defaultAdvanced,
				compressed: true,
				proxy: 'http://proxy:8080',
			};
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<AdvancedEditor advanced={advanced} onChange={onChange} />);

			// Change rawFlags
			const textarea = screen.getByLabelText('Additional cURL Flags');
			await user.click(textarea);
			await user.paste('--verbose');

			expect(onChange).toHaveBeenCalledWith({
				...advanced,
				rawFlags: '--verbose',
			});
		});
	});
});
