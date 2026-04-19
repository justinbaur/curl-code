import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';

// Mock child components to isolate App layout logic
vi.mock('../../../components/RequestBuilder/RequestBuilder', () => ({
	RequestBuilder: ({ onChange, request }: any) => (
		<div data-testid="request-builder">
			<button
				data-testid="trigger-change"
				onClick={() => onChange({ ...request, name: 'changed' })}
			>
				Trigger Change
			</button>
		</div>
	),
}));

vi.mock('../../../components/ResponseViewer/ResponseViewer', () => ({
	ResponseViewer: ({ response }: any) => (
		<div data-testid="response-viewer" data-has-response={String(!!response)}>
			ResponseViewer
		</div>
	),
}));

vi.mock('../../../components/common/LoadingSpinner', () => ({
	LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../../../components/common/EnvironmentPicker', () => ({
	EnvironmentPicker: () => <div data-testid="environment-picker">EnvironmentPicker</div>,
}));

describe('App', () => {
	describe('layout structure', () => {
		it('should render panels container with horizontal layout by default', () => {
			const { container } = render(<App />);
			const panelsContainer = container.querySelector('.panels-container');

			expect(panelsContainer).toBeInTheDocument();
			expect(panelsContainer).toHaveClass('horizontal');
		});

		it('should render request and response panels', () => {
			const { container } = render(<App />);

			expect(container.querySelector('.request-panel')).toBeInTheDocument();
			expect(container.querySelector('.response-panel')).toBeInTheDocument();
		});

		it('should render resize handle with horizontal class by default', () => {
			const { container } = render(<App />);
			const handle = container.querySelector('.resize-handle');

			expect(handle).toBeInTheDocument();
			expect(handle).toHaveClass('horizontal');
		});

		it('should render the layout toggle button', () => {
			render(<App />);
			const toggle = screen.getByTitle('Switch to side-by-side layout');

			expect(toggle).toBeInTheDocument();
			expect(toggle).toHaveClass('toolbar-button');
		});

		it('should set default 50/50 split ratio on panels', () => {
			const { container } = render(<App />);
			const requestPanel = container.querySelector('.request-panel') as HTMLElement;
			const responsePanel = container.querySelector('.response-panel') as HTMLElement;

			expect(requestPanel.style.height).toBe('calc(50% - 3px)');
			expect(responsePanel.style.height).toBe('calc(50% - 3px)');
		});
	});

	describe('layout toggle', () => {
		it('should switch to vertical layout when toggle is clicked', async () => {
			const user = userEvent.setup();
			const { container } = render(<App />);

			const toggle = screen.getByTitle('Switch to side-by-side layout');
			await user.click(toggle);

			const panelsContainer = container.querySelector('.panels-container');
			expect(panelsContainer).toHaveClass('vertical');
		});

		it('should update resize handle class when layout changes', async () => {
			const user = userEvent.setup();
			const { container } = render(<App />);

			const toggle = screen.getByTitle('Switch to side-by-side layout');
			await user.click(toggle);

			const handle = container.querySelector('.resize-handle');
			expect(handle).toHaveClass('vertical');
		});

		it('should switch panel sizing from height to width in vertical layout', async () => {
			const user = userEvent.setup();
			const { container } = render(<App />);

			const toggle = screen.getByTitle('Switch to side-by-side layout');
			await user.click(toggle);

			const requestPanel = container.querySelector('.request-panel') as HTMLElement;
			const responsePanel = container.querySelector('.response-panel') as HTMLElement;

			expect(requestPanel.style.width).toBe('calc(50% - 3px)');
			expect(responsePanel.style.width).toBe('calc(50% - 3px)');
			expect(requestPanel.style.height).toBe('');
			expect(responsePanel.style.height).toBe('');
		});

		it('should update toggle title when in vertical layout', async () => {
			const user = userEvent.setup();
			render(<App />);

			const toggle = screen.getByTitle('Switch to side-by-side layout');
			await user.click(toggle);

			expect(screen.getByTitle('Switch to stacked layout')).toBeInTheDocument();
		});

		it('should toggle back to horizontal layout on second click', async () => {
			const user = userEvent.setup();
			const { container } = render(<App />);

			const toggle = screen.getByTitle('Switch to side-by-side layout');
			await user.click(toggle);
			await user.click(screen.getByTitle('Switch to stacked layout'));

			const panelsContainer = container.querySelector('.panels-container');
			expect(panelsContainer).toHaveClass('horizontal');
		});
	});

	describe('resize handle', () => {
		it('should set cursor style on document body when mousedown on handle', () => {
			const { container } = render(<App />);
			const handle = container.querySelector('.resize-handle') as HTMLElement;

			fireEvent.mouseDown(handle);

			expect(document.body.style.cursor).toBe('row-resize');
			expect(document.body.style.userSelect).toBe('none');

			// Cleanup
			fireEvent.mouseUp(document);
		});

		it('should set col-resize cursor in vertical layout', async () => {
			const user = userEvent.setup();
			const { container } = render(<App />);

			const toggle = screen.getByTitle('Switch to side-by-side layout');
			await user.click(toggle);

			const handle = container.querySelector('.resize-handle') as HTMLElement;
			fireEvent.mouseDown(handle);

			expect(document.body.style.cursor).toBe('col-resize');

			// Cleanup
			fireEvent.mouseUp(document);
		});

		it('should reset cursor on mouseup', () => {
			const { container } = render(<App />);
			const handle = container.querySelector('.resize-handle') as HTMLElement;

			fireEvent.mouseDown(handle);
			fireEvent.mouseUp(document);

			expect(document.body.style.cursor).toBe('');
			expect(document.body.style.userSelect).toBe('');
		});

		it('should add and remove document event listeners during drag', () => {
			const addSpy = vi.spyOn(document, 'addEventListener');
			const removeSpy = vi.spyOn(document, 'removeEventListener');

			const { container } = render(<App />);
			const handle = container.querySelector('.resize-handle') as HTMLElement;

			fireEvent.mouseDown(handle);

			expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
			expect(addSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

			fireEvent.mouseUp(document);

			expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
			expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

			addSpy.mockRestore();
			removeSpy.mockRestore();
		});
	});

	describe('app top bar', () => {
		it('should render environment picker, toolbar buttons, and layout toggle in top bar', () => {
			const { container } = render(<App />);
			const topBar = container.querySelector('.app-top-bar');

			expect(topBar).toBeInTheDocument();
			expect(screen.getByTestId('environment-picker')).toBeInTheDocument();
			expect(screen.getByTitle('Switch to side-by-side layout')).toBeInTheDocument();
			expect(topBar?.querySelector('.top-bar-actions')).toBeInTheDocument();
		});

		it('should group Save and Save As in a toolbar-group', () => {
			const { container } = render(<App />);
			const group = container.querySelector('.toolbar-group');
			expect(group).toBeInTheDocument();
			const buttons = group?.querySelectorAll('.toolbar-button');
			expect(buttons).toHaveLength(2);
		});

		it('should show Split label on layout toggle in horizontal mode', () => {
			render(<App />);
			const toggle = screen.getByTitle('Switch to side-by-side layout');
			expect(toggle.textContent).toContain('Split');
		});

		it('should show Stack label on layout toggle in vertical mode', async () => {
			const user = userEvent.setup();
			render(<App />);
			await user.click(screen.getByTitle('Switch to side-by-side layout'));
			const toggle = screen.getByTitle('Switch to stacked layout');
			expect(toggle.textContent).toContain('Stack');
		});
	});

	describe('dirty state', () => {
		it('should not show dirty dot initially', () => {
			const { container } = render(<App />);
			expect(container.querySelector('.dirty-dot')).not.toBeInTheDocument();
		});

		it('should show dirty dot after a request change', async () => {
			const user = userEvent.setup();
			const { container } = render(<App />);

			await user.click(screen.getByTestId('trigger-change'));

			expect(container.querySelector('.dirty-dot')).toBeInTheDocument();
		});

		it('should clear dirty dot when a loadRequest message arrives', async () => {
			const user = userEvent.setup();
			const { container } = render(<App />);

			await user.click(screen.getByTestId('trigger-change'));
			expect(container.querySelector('.dirty-dot')).toBeInTheDocument();

			act(() => {
				window.dispatchEvent(new MessageEvent('message', {
					data: {
						type: 'loadRequest',
						request: { id: 'r1', name: 'Loaded', method: 'GET', url: '', headers: [], queryParams: [], body: { type: 'none', content: '' }, auth: { type: 'none' }, createdAt: 0, updatedAt: 0 },
					},
				}));
			});

			await waitFor(() => {
				expect(container.querySelector('.dirty-dot')).not.toBeInTheDocument();
			});
		});
	});

	describe('history response restoration', () => {
		it('should show no response before any message', () => {
			render(<App />);
			expect(screen.getByTestId('response-viewer')).toHaveAttribute('data-has-response', 'false');
		});

		it('should set response when responseReceived message arrives', async () => {
			render(<App />);

			act(() => {
				window.dispatchEvent(new MessageEvent('message', {
					data: {
						type: 'responseReceived',
						response: { status: 200, statusText: 'OK', headers: {}, body: '{}', contentType: 'application/json', size: 2, time: 50, curlCommand: '' },
					},
				}));
			});

			await waitFor(() => {
				expect(screen.getByTestId('response-viewer')).toHaveAttribute('data-has-response', 'true');
			});
		});

		it('should restore response immediately after loadRequest when both messages arrive', async () => {
			render(<App />);

			act(() => {
				window.dispatchEvent(new MessageEvent('message', {
					data: {
						type: 'loadRequest',
						request: { id: 'r1', name: 'From History', method: 'GET', url: 'https://api.example.com', headers: [], queryParams: [], body: { type: 'none', content: '' }, auth: { type: 'none' }, createdAt: 0, updatedAt: 0 },
					},
				}));
				window.dispatchEvent(new MessageEvent('message', {
					data: {
						type: 'responseReceived',
						response: { status: 404, statusText: 'Not Found', headers: {}, body: '{}', contentType: 'application/json', size: 2, time: 80, curlCommand: '' },
					},
				}));
			});

			await waitFor(() => {
				expect(screen.getByTestId('response-viewer')).toHaveAttribute('data-has-response', 'true');
			});
		});

		it('should clear response when a new loadRequest arrives without a response', async () => {
			render(<App />);

			// First load with response
			act(() => {
				window.dispatchEvent(new MessageEvent('message', {
					data: { type: 'responseReceived', response: { status: 200, statusText: 'OK', headers: {}, body: '', contentType: '', size: 0, time: 0, curlCommand: '' } },
				}));
			});
			await waitFor(() => {
				expect(screen.getByTestId('response-viewer')).toHaveAttribute('data-has-response', 'true');
			});

			// New loadRequest clears response
			act(() => {
				window.dispatchEvent(new MessageEvent('message', {
					data: { type: 'loadRequest', request: { id: 'r2', name: 'New', method: 'GET', url: '', headers: [], queryParams: [], body: { type: 'none', content: '' }, auth: { type: 'none' }, createdAt: 0, updatedAt: 0 } },
				}));
			});
			await waitFor(() => {
				expect(screen.getByTestId('response-viewer')).toHaveAttribute('data-has-response', 'false');
			});
		});
	});
});
