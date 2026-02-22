import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestBuilder } from '../../../components/RequestBuilder/RequestBuilder';
import type { HttpRequest } from '../../../vscode';

// Mock child components to isolate RequestBuilder logic
vi.mock('../../../components/RequestBuilder/MethodSelector', () => ({
	MethodSelector: ({ value, onChange }: any) => (
		<select data-testid="method-selector" value={value} onChange={(e) => onChange(e.target.value)}>
			<option value="GET">GET</option>
			<option value="POST">POST</option>
		</select>
	),
}));

vi.mock('../../../components/RequestBuilder/UrlBar', () => ({
	UrlBar: ({ value, onChange, onKeyDown }: any) => (
		<input
			data-testid="url-bar"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onKeyDown={onKeyDown}
		/>
	),
}));

vi.mock('../../../components/RequestBuilder/QueryParamsEditor', () => ({
	QueryParamsEditor: ({ params, onChange }: any) => (
		<div data-testid="query-params-editor">Query Params Editor</div>
	),
}));

vi.mock('../../../components/RequestBuilder/HeadersEditor', () => ({
	HeadersEditor: ({ headers, onChange }: any) => (
		<div data-testid="headers-editor">Headers Editor</div>
	),
}));

vi.mock('../../../components/RequestBuilder/BodyEditor', () => ({
	BodyEditor: ({ body, onChange }: any) => (
		<div data-testid="body-editor">Body Editor</div>
	),
}));

vi.mock('../../../components/RequestBuilder/AuthEditor', () => ({
	AuthEditor: ({ auth, onChange }: any) => (
		<div data-testid="auth-editor">Auth Editor</div>
	),
}));

vi.mock('../../../components/common/TabPanel', () => ({
	TabPanel: ({ tabs, activeTab, onTabChange }: any) => (
		<div data-testid="tab-panel">
			{tabs.map((tab: any) => (
				<button
					key={tab.id}
					data-testid={`tab-${tab.id}`}
					onClick={() => onTabChange(tab.id)}
					aria-current={activeTab === tab.id ? 'page' : undefined}
				>
					{tab.label}
					{tab.badge > 0 && <span data-testid={`badge-${tab.id}`}>{tab.badge}</span>}
				</button>
			))}
		</div>
	),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockRequest = (overrides?: Partial<HttpRequest>): HttpRequest => ({
	id: 'test-request',
	name: 'Test Request',
	method: 'GET',
	url: 'https://api.example.com',
	queryParams: [],
	headers: [],
	body: { type: 'none', content: '' },
	auth: { type: 'none' },
	createdAt: 0,
	updatedAt: 0,
	...overrides,
});

interface RenderOptions {
	request?: HttpRequest;
	isLoading?: boolean;
	isDirty?: boolean;
	onChange?: (request: HttpRequest) => void;
	onSend?: () => void;
	onSave?: () => void;
	onSaveAs?: () => void;
	onCopyAsCurl?: () => void;
}

function renderBuilder(opts: RenderOptions = {}) {
	const props = {
		request: opts.request ?? createMockRequest(),
		isLoading: opts.isLoading ?? false,
		isDirty: opts.isDirty ?? false,
		onChange: opts.onChange ?? (vi.fn() as (request: HttpRequest) => void),
		onSend: opts.onSend ?? (vi.fn() as () => void),
		onSave: opts.onSave ?? (vi.fn() as () => void),
		onSaveAs: opts.onSaveAs ?? (vi.fn() as () => void),
		onCopyAsCurl: opts.onCopyAsCurl ?? (vi.fn() as () => void),
	};
	render(<RequestBuilder {...props} />);
	return props;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RequestBuilder', () => {
	describe('rendering', () => {
		it('should render all main sections', () => {
			renderBuilder();

			expect(screen.getByTestId('method-selector')).toBeInTheDocument();
			expect(screen.getByTestId('url-bar')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save as/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /copy as curl/i })).toBeInTheDocument();
			expect(screen.getByTestId('tab-panel')).toBeInTheDocument();
		});

		it('should render request name input', () => {
			renderBuilder({ request: createMockRequest({ name: 'My Request' }) });

			const nameInput = screen.getByPlaceholderText('Request Name');
			expect(nameInput).toHaveValue('My Request');
		});

		it('should render all tabs', () => {
			renderBuilder();

			expect(screen.getByTestId('tab-params')).toBeInTheDocument();
			expect(screen.getByTestId('tab-headers')).toBeInTheDocument();
			expect(screen.getByTestId('tab-body')).toBeInTheDocument();
			expect(screen.getByTestId('tab-auth')).toBeInTheDocument();
		});

		it('should show params tab content by default', () => {
			renderBuilder();

			expect(screen.getByTestId('query-params-editor')).toBeInTheDocument();
		});
	});

	describe('request name', () => {
		it('should call onChange when name changes', async () => {
			const request = createMockRequest({ name: '' });
			const onChange = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ request, onChange });

			const nameInput = screen.getByPlaceholderText('Request Name');
			await user.click(nameInput);
			await user.paste('New Name');

			expect(onChange).toHaveBeenLastCalledWith({ ...request, name: 'New Name' });
		});
	});

	describe('method selector', () => {
		it('should call onChange when method changes', async () => {
			const request = createMockRequest({ method: 'GET' });
			const onChange = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ request, onChange });

			const methodSelector = screen.getByTestId('method-selector');
			await user.selectOptions(methodSelector, 'POST');

			expect(onChange).toHaveBeenCalledWith({ ...request, method: 'POST' });
		});
	});

	describe('url bar', () => {
		it('should call onChange when URL changes', async () => {
			const request = createMockRequest({ url: '' });
			const onChange = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ request, onChange });

			const urlBar = screen.getByTestId('url-bar');
			await user.click(urlBar);
			await user.paste('https://api.example.com');

			expect(onChange).toHaveBeenLastCalledWith({ ...request, url: 'https://api.example.com' });
		});

		it('should call onSend when Enter is pressed and URL is present', async () => {
			const onSend = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ request: createMockRequest({ url: 'https://api.example.com' }), onSend });

			await user.click(screen.getByTestId('url-bar'));
			await user.keyboard('{Enter}');

			expect(onSend).toHaveBeenCalledTimes(1);
		});

		it('should not call onSend when Enter is pressed and URL is empty', async () => {
			const onSend = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ request: createMockRequest({ url: '' }), onSend });

			await user.click(screen.getByTestId('url-bar'));
			await user.keyboard('{Enter}');

			expect(onSend).not.toHaveBeenCalled();
		});

		it('should not call onSend when Enter is pressed while loading', async () => {
			const onSend = vi.fn();
			const user = userEvent.setup();

			renderBuilder({
				request: createMockRequest({ url: 'https://api.example.com' }),
				onSend,
				isLoading: true,
			});

			await user.click(screen.getByTestId('url-bar'));
			await user.keyboard('{Enter}');

			expect(onSend).not.toHaveBeenCalled();
		});
	});

	describe('send button', () => {
		it('should be enabled when URL is provided and not loading', () => {
			renderBuilder({ request: createMockRequest({ url: 'https://api.example.com' }) });

			expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled();
		});

		it('should be disabled when URL is empty', () => {
			renderBuilder({ request: createMockRequest({ url: '' }) });

			expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
		});

		it('should be disabled when loading', () => {
			renderBuilder({ request: createMockRequest({ url: 'https://api.example.com' }), isLoading: true });

			expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
		});

		it('should show "Sending..." when loading', () => {
			renderBuilder({ request: createMockRequest({ url: 'https://api.example.com' }), isLoading: true });

			expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
		});

		it('should call onSend when clicked', async () => {
			const onSend = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ request: createMockRequest({ url: 'https://api.example.com' }), onSend });

			await user.click(screen.getByRole('button', { name: /send/i }));

			expect(onSend).toHaveBeenCalledTimes(1);
		});
	});

	describe('toolbar buttons', () => {
		it('should show "Save" label when not dirty', () => {
			renderBuilder({ isDirty: false });

			expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
		});

		it('should show "* Save" label when dirty', () => {
			renderBuilder({ isDirty: true });

			expect(screen.getByRole('button', { name: /^\* save$/i })).toBeInTheDocument();
		});

		it('should call onSave when Save button clicked', async () => {
			const onSave = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ isDirty: false, onSave });

			await user.click(screen.getByRole('button', { name: /^save$/i }));

			expect(onSave).toHaveBeenCalledTimes(1);
		});

		it('should call onSaveAs when Save As button clicked', async () => {
			const onSaveAs = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ onSaveAs });

			await user.click(screen.getByRole('button', { name: /save as/i }));

			expect(onSaveAs).toHaveBeenCalledTimes(1);
		});

		it('should call onCopyAsCurl when Copy as cURL button clicked', async () => {
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			renderBuilder({ onCopyAsCurl });

			await user.click(screen.getByRole('button', { name: /copy as curl/i }));

			expect(onCopyAsCurl).toHaveBeenCalledTimes(1);
		});
	});

	describe('tab switching', () => {
		it('should switch to headers tab when clicked', async () => {
			const user = userEvent.setup();
			renderBuilder();

			await user.click(screen.getByTestId('tab-headers'));

			expect(screen.getByTestId('headers-editor')).toBeInTheDocument();
			expect(screen.queryByTestId('query-params-editor')).not.toBeInTheDocument();
		});

		it('should switch to body tab when clicked', async () => {
			const user = userEvent.setup();
			renderBuilder();

			await user.click(screen.getByTestId('tab-body'));

			expect(screen.getByTestId('body-editor')).toBeInTheDocument();
			expect(screen.queryByTestId('query-params-editor')).not.toBeInTheDocument();
		});

		it('should switch to auth tab when clicked', async () => {
			const user = userEvent.setup();
			renderBuilder();

			await user.click(screen.getByTestId('tab-auth'));

			expect(screen.getByTestId('auth-editor')).toBeInTheDocument();
			expect(screen.queryByTestId('query-params-editor')).not.toBeInTheDocument();
		});
	});

	describe('tab badges', () => {
		it('should show badge for enabled query params', () => {
			renderBuilder({
				request: createMockRequest({
					queryParams: [
						{ key: 'foo', value: 'bar', enabled: true },
						{ key: 'baz', value: 'qux', enabled: true },
						{ key: 'disabled', value: 'value', enabled: false },
					],
				}),
			});

			expect(screen.getByTestId('badge-params')).toHaveTextContent('2');
		});

		it('should show badge for enabled headers', () => {
			renderBuilder({
				request: createMockRequest({
					headers: [
						{ key: 'Content-Type', value: 'application/json', enabled: true },
						{ key: 'Authorization', value: 'Bearer token', enabled: true },
						{ key: 'X-Custom', value: 'value', enabled: false },
					],
				}),
			});

			expect(screen.getByTestId('badge-headers')).toHaveTextContent('2');
		});

		it('should show badge for non-none body', () => {
			renderBuilder({ request: createMockRequest({ body: { type: 'json', content: '{}' } }) });

			expect(screen.getByTestId('badge-body')).toHaveTextContent('1');
		});

		it('should show badge for non-none auth', () => {
			renderBuilder({ request: createMockRequest({ auth: { type: 'bearer', token: 'abc123' } }) });

			expect(screen.getByTestId('badge-auth')).toHaveTextContent('1');
		});

		it('should not show badge when no params are enabled', () => {
			renderBuilder({
				request: createMockRequest({ queryParams: [{ key: 'foo', value: 'bar', enabled: false }] }),
			});

			expect(screen.queryByTestId('badge-params')).not.toBeInTheDocument();
		});
	});
});
