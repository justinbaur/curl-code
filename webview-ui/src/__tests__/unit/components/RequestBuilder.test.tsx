import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

describe('RequestBuilder', () => {
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

	describe('rendering', () => {
		it('should render all main sections', () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			expect(screen.getByTestId('method-selector')).toBeInTheDocument();
			expect(screen.getByTestId('url-bar')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /copy as curl/i })).toBeInTheDocument();
			expect(screen.getByTestId('tab-panel')).toBeInTheDocument();
		});

		it('should render request name input', () => {
			const request = createMockRequest({ name: 'My Request' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const nameInput = screen.getByPlaceholderText('Request Name');
			expect(nameInput).toHaveValue('My Request');
		});

		it('should render all tabs', () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			expect(screen.getByTestId('tab-params')).toBeInTheDocument();
			expect(screen.getByTestId('tab-headers')).toBeInTheDocument();
			expect(screen.getByTestId('tab-body')).toBeInTheDocument();
			expect(screen.getByTestId('tab-auth')).toBeInTheDocument();
		});

		it('should show params tab content by default', () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			expect(screen.getByTestId('query-params-editor')).toBeInTheDocument();
		});
	});

	describe('request name', () => {
		it('should call onChange when name changes', async () => {
			const request = createMockRequest({ name: '' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const nameInput = screen.getByPlaceholderText('Request Name');
			await user.click(nameInput);
			await user.paste('New Name');

			expect(onChange).toHaveBeenLastCalledWith({
				...request,
				name: 'New Name',
			});
		});
	});

	describe('method selector', () => {
		it('should call onChange when method changes', async () => {
			const request = createMockRequest({ method: 'GET' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const methodSelector = screen.getByTestId('method-selector');
			await user.selectOptions(methodSelector, 'POST');

			expect(onChange).toHaveBeenCalledWith({
				...request,
				method: 'POST',
			});
		});
	});

	describe('url bar', () => {
		it('should call onChange when URL changes', async () => {
			const request = createMockRequest({ url: '' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const urlBar = screen.getByTestId('url-bar');
			await user.click(urlBar);
			await user.paste('https://api.example.com');

			expect(onChange).toHaveBeenLastCalledWith({
				...request,
				url: 'https://api.example.com',
			});
		});
	});

	describe('send button', () => {
		it('should be enabled when URL is provided and not loading', () => {
			const request = createMockRequest({ url: 'https://api.example.com' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const sendButton = screen.getByRole('button', { name: /send/i });
			expect(sendButton).not.toBeDisabled();
		});

		it('should be disabled when URL is empty', () => {
			const request = createMockRequest({ url: '' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const sendButton = screen.getByRole('button', { name: /send/i });
			expect(sendButton).toBeDisabled();
		});

		it('should be disabled when loading', () => {
			const request = createMockRequest({ url: 'https://api.example.com' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={true}
				/>
			);

			const sendButton = screen.getByRole('button', { name: /sending/i });
			expect(sendButton).toBeDisabled();
		});

		it('should show "Sending..." when loading', () => {
			const request = createMockRequest({ url: 'https://api.example.com' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={true}
				/>
			);

			expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
		});

		it('should call onSend when clicked', async () => {
			const request = createMockRequest({ url: 'https://api.example.com' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const sendButton = screen.getByRole('button', { name: /send/i });
			await user.click(sendButton);

			expect(onSend).toHaveBeenCalledTimes(1);
		});
	});

	describe('toolbar buttons', () => {
		it('should call onSave when Save button clicked', async () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const saveButton = screen.getByRole('button', { name: /save/i });
			await user.click(saveButton);

			expect(onSave).toHaveBeenCalledTimes(1);
		});

		it('should call onCopyAsCurl when Copy as cURL button clicked', async () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const copyButton = screen.getByRole('button', { name: /copy as curl/i });
			await user.click(copyButton);

			expect(onCopyAsCurl).toHaveBeenCalledTimes(1);
		});
	});

	describe('keyboard shortcuts', () => {
		it('should call onSend when Ctrl+Enter is pressed in URL bar', async () => {
			const request = createMockRequest({ url: 'https://api.example.com' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const urlBar = screen.getByTestId('url-bar');
			await user.type(urlBar, '{Control>}{Enter}{/Control}');

			expect(onSend).toHaveBeenCalledTimes(1);
		});

		it('should call onSend when Cmd+Enter is pressed in URL bar (Mac)', async () => {
			const request = createMockRequest({ url: 'https://api.example.com' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const urlBar = screen.getByTestId('url-bar');
			await user.type(urlBar, '{Meta>}{Enter}{/Meta}');

			expect(onSend).toHaveBeenCalledTimes(1);
		});

		it('should not call onSend when URL is empty', async () => {
			const request = createMockRequest({ url: '' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const urlBar = screen.getByTestId('url-bar');
			await user.type(urlBar, '{Control>}{Enter}{/Control}');

			expect(onSend).not.toHaveBeenCalled();
		});

		it('should not call onSend when loading', async () => {
			const request = createMockRequest({ url: 'https://api.example.com' });
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={true}
				/>
			);

			const urlBar = screen.getByTestId('url-bar');
			await user.type(urlBar, '{Control>}{Enter}{/Control}');

			expect(onSend).not.toHaveBeenCalled();
		});
	});

	describe('tab switching', () => {
		it('should switch to headers tab when clicked', async () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const headersTab = screen.getByTestId('tab-headers');
			await user.click(headersTab);

			expect(screen.getByTestId('headers-editor')).toBeInTheDocument();
			expect(screen.queryByTestId('query-params-editor')).not.toBeInTheDocument();
		});

		it('should switch to body tab when clicked', async () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const bodyTab = screen.getByTestId('tab-body');
			await user.click(bodyTab);

			expect(screen.getByTestId('body-editor')).toBeInTheDocument();
			expect(screen.queryByTestId('query-params-editor')).not.toBeInTheDocument();
		});

		it('should switch to auth tab when clicked', async () => {
			const request = createMockRequest();
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();
			const user = userEvent.setup();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const authTab = screen.getByTestId('tab-auth');
			await user.click(authTab);

			expect(screen.getByTestId('auth-editor')).toBeInTheDocument();
			expect(screen.queryByTestId('query-params-editor')).not.toBeInTheDocument();
		});
	});

	describe('tab badges', () => {
		it('should show badge for enabled query params', () => {
			const request = createMockRequest({
				queryParams: [
					{ key: 'foo', value: 'bar', enabled: true },
					{ key: 'baz', value: 'qux', enabled: true },
					{ key: 'disabled', value: 'value', enabled: false },
				],
			});
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const badge = screen.getByTestId('badge-params');
			expect(badge).toHaveTextContent('2');
		});

		it('should show badge for enabled headers', () => {
			const request = createMockRequest({
				headers: [
					{ key: 'Content-Type', value: 'application/json', enabled: true },
					{ key: 'Authorization', value: 'Bearer token', enabled: true },
					{ key: 'X-Custom', value: 'value', enabled: false },
				],
			});
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const badge = screen.getByTestId('badge-headers');
			expect(badge).toHaveTextContent('2');
		});

		it('should show badge for non-none body', () => {
			const request = createMockRequest({
				body: { type: 'json', content: '{}' },
			});
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const badge = screen.getByTestId('badge-body');
			expect(badge).toHaveTextContent('1');
		});

		it('should show badge for non-none auth', () => {
			const request = createMockRequest({
				auth: { type: 'bearer', token: 'abc123' },
			});
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			const badge = screen.getByTestId('badge-auth');
			expect(badge).toHaveTextContent('1');
		});

		it('should not show badge when no params are enabled', () => {
			const request = createMockRequest({
				queryParams: [{ key: 'foo', value: 'bar', enabled: false }],
			});
			const onChange = vi.fn();
			const onSend = vi.fn();
			const onSave = vi.fn();
			const onCopyAsCurl = vi.fn();

			render(
				<RequestBuilder
					request={request}
					onChange={onChange}
					onSend={onSend}
					onSave={onSave}
					onCopyAsCurl={onCopyAsCurl}
					isLoading={false}
				/>
			);

			expect(screen.queryByTestId('badge-params')).not.toBeInTheDocument();
		});
	});
});
