import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';

// Mock child components to isolate App layout logic
vi.mock('../../../components/RequestBuilder/RequestBuilder', () => ({
	RequestBuilder: () => <div data-testid="request-builder">RequestBuilder</div>,
}));

vi.mock('../../../components/ResponseViewer/ResponseViewer', () => ({
	ResponseViewer: () => <div data-testid="response-viewer">ResponseViewer</div>,
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
			expect(toggle).toHaveClass('layout-toggle');
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
		it('should render environment picker and layout toggle in top bar', () => {
			const { container } = render(<App />);
			const topBar = container.querySelector('.app-top-bar');

			expect(topBar).toBeInTheDocument();
			expect(screen.getByTestId('environment-picker')).toBeInTheDocument();
			expect(topBar?.querySelector('.layout-toggle')).toBeInTheDocument();
		});
	});
});
