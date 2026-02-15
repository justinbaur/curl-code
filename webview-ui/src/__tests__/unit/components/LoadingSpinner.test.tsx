import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
	describe('rendering', () => {
		it('should render loading container', () => {
			const { container } = render(<LoadingSpinner />);

			expect(container.querySelector('.loading-container')).toBeInTheDocument();
		});

		it('should render loading spinner element', () => {
			const { container } = render(<LoadingSpinner />);

			expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
		});

		it('should render loading message', () => {
			render(<LoadingSpinner />);

			expect(screen.getByText('Sending request...')).toBeInTheDocument();
		});

		it('should render message in paragraph tag', () => {
			render(<LoadingSpinner />);

			const message = screen.getByText('Sending request...');
			expect(message.tagName).toBe('P');
		});
	});

	describe('cancel button', () => {
		it('should render cancel button when onCancel is provided', () => {
			const onCancel = vi.fn();
			render(<LoadingSpinner onCancel={onCancel} />);

			expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		});

		it('should not render cancel button when onCancel is not provided', () => {
			render(<LoadingSpinner />);

			expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
		});

		it('should apply cancel-button class to cancel button', () => {
			const onCancel = vi.fn();
			render(<LoadingSpinner onCancel={onCancel} />);

			const button = screen.getByRole('button', { name: 'Cancel' });
			expect(button).toHaveClass('cancel-button');
		});

		it('should apply btn-secondary class to cancel button', () => {
			const onCancel = vi.fn();
			render(<LoadingSpinner onCancel={onCancel} />);

			const button = screen.getByRole('button', { name: 'Cancel' });
			expect(button).toHaveClass('btn-secondary');
		});

		it('should have button type', () => {
			const onCancel = vi.fn();
			render(<LoadingSpinner onCancel={onCancel} />);

			const button = screen.getByRole('button', { name: 'Cancel' });
			expect(button).toHaveAttribute('type', 'button');
		});
	});

	describe('user interactions', () => {
		it('should call onCancel when cancel button is clicked', async () => {
			const onCancel = vi.fn();
			const user = userEvent.setup();

			render(<LoadingSpinner onCancel={onCancel} />);

			const cancelButton = screen.getByRole('button', { name: 'Cancel' });
			await user.click(cancelButton);

			expect(onCancel).toHaveBeenCalledTimes(1);
		});

		it('should call onCancel on each click', async () => {
			const onCancel = vi.fn();
			const user = userEvent.setup();

			render(<LoadingSpinner onCancel={onCancel} />);

			const cancelButton = screen.getByRole('button', { name: 'Cancel' });

			await user.click(cancelButton);
			await user.click(cancelButton);
			await user.click(cancelButton);

			expect(onCancel).toHaveBeenCalledTimes(3);
		});

		it('should not throw error when no onCancel provided and component is rendered', () => {
			expect(() => {
				render(<LoadingSpinner />);
			}).not.toThrow();
		});
	});

	describe('conditional rendering', () => {
		it('should show loading spinner without cancel button', () => {
			const { container } = render(<LoadingSpinner />);

			expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
			expect(screen.getByText('Sending request...')).toBeInTheDocument();
			expect(screen.queryByRole('button')).not.toBeInTheDocument();
		});

		it('should show loading spinner with cancel button', () => {
			const onCancel = vi.fn();
			const { container } = render(<LoadingSpinner onCancel={onCancel} />);

			expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
			expect(screen.getByText('Sending request...')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		});

		it('should update when onCancel changes from undefined to function', () => {
			const { rerender } = render(<LoadingSpinner />);

			expect(screen.queryByRole('button')).not.toBeInTheDocument();

			const onCancel = vi.fn();
			rerender(<LoadingSpinner onCancel={onCancel} />);

			expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
		});

		it('should update when onCancel changes from function to undefined', () => {
			const onCancel = vi.fn();
			const { rerender } = render(<LoadingSpinner onCancel={onCancel} />);

			expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

			rerender(<LoadingSpinner />);

			expect(screen.queryByRole('button')).not.toBeInTheDocument();
		});
	});

	describe('accessibility', () => {
		it('should have accessible button when onCancel provided', () => {
			const onCancel = vi.fn();
			render(<LoadingSpinner onCancel={onCancel} />);

			const button = screen.getByRole('button', { name: 'Cancel' });
			expect(button).toBeVisible();
		});

		it('should have descriptive loading message', () => {
			render(<LoadingSpinner />);

			const message = screen.getByText('Sending request...');
			expect(message).toBeVisible();
		});
	});

	describe('structure', () => {
		it('should render spinner before message', () => {
			const { container } = render(<LoadingSpinner />);

			const loadingContainer = container.querySelector('.loading-container');
			const children = Array.from(loadingContainer?.children || []);

			expect(children[0]).toHaveClass('loading-spinner');
			expect(children[1].tagName).toBe('P');
		});

		it('should render cancel button last when present', () => {
			const onCancel = vi.fn();
			const { container } = render(<LoadingSpinner onCancel={onCancel} />);

			const loadingContainer = container.querySelector('.loading-container');
			const children = Array.from(loadingContainer?.children || []);

			expect(children[0]).toHaveClass('loading-spinner');
			expect(children[1].tagName).toBe('P');
			expect(children[2]).toHaveClass('cancel-button');
		});
	});

	describe('edge cases', () => {
		it('should handle onCancel being reassigned', async () => {
			const onCancel1 = vi.fn();
			const onCancel2 = vi.fn();
			const user = userEvent.setup();

			const { rerender } = render(<LoadingSpinner onCancel={onCancel1} />);

			const button = screen.getByRole('button', { name: 'Cancel' });
			await user.click(button);

			expect(onCancel1).toHaveBeenCalledTimes(1);
			expect(onCancel2).not.toHaveBeenCalled();

			rerender(<LoadingSpinner onCancel={onCancel2} />);

			await user.click(button);

			expect(onCancel1).toHaveBeenCalledTimes(1);
			expect(onCancel2).toHaveBeenCalledTimes(1);
		});

		it('should handle rapid clicks on cancel button', async () => {
			const onCancel = vi.fn();
			const user = userEvent.setup();

			render(<LoadingSpinner onCancel={onCancel} />);

			const button = screen.getByRole('button', { name: 'Cancel' });

			// Rapid clicks
			await user.click(button);
			await user.click(button);
			await user.click(button);
			await user.click(button);
			await user.click(button);

			expect(onCancel).toHaveBeenCalledTimes(5);
		});
	});
});
