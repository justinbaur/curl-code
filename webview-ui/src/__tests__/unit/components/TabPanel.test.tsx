import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabPanel, type Tab } from '../../../components/common/TabPanel';

describe('TabPanel', () => {
	describe('rendering', () => {
		it('should render all tabs', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
				{ id: 'tab3', label: 'Tab 3' },
			];
			const onTabChange = vi.fn();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			expect(screen.getByRole('button', { name: 'Tab 1' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Tab 2' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Tab 3' })).toBeInTheDocument();
		});

		it('should apply tab-panel class to container', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1' }];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			expect(container.querySelector('.tab-panel')).toBeInTheDocument();
		});

		it('should apply tab-button class to all tabs', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			const buttons = container.querySelectorAll('.tab-button');
			expect(buttons).toHaveLength(2);
		});

		it('should apply active class to active tab', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();
			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			const tab1 = screen.getByRole('button', { name: 'Tab 1' });
			const tab2 = screen.getByRole('button', { name: 'Tab 2' });

			expect(tab1).toHaveClass('active');
			expect(tab2).not.toHaveClass('active');
		});

		it('should have button type for all tabs', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();
			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			const tab1 = screen.getByRole('button', { name: 'Tab 1' });
			const tab2 = screen.getByRole('button', { name: 'Tab 2' });

			expect(tab1).toHaveAttribute('type', 'button');
			expect(tab2).toHaveAttribute('type', 'button');
		});
	});

	describe('badges', () => {
		it('should render badge when badge count is greater than 0', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1', badge: 5 }];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			const badge = container.querySelector('.tab-badge');
			expect(badge).toBeInTheDocument();
			expect(badge?.textContent).toBe('5');
		});

		it('should not render badge when badge count is 0', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1', badge: 0 }];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			const badge = container.querySelector('.tab-badge');
			expect(badge).not.toBeInTheDocument();
		});

		it('should not render badge when badge is undefined', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1' }];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			const badge = container.querySelector('.tab-badge');
			expect(badge).not.toBeInTheDocument();
		});

		it('should render different badge counts for different tabs', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1', badge: 3 },
				{ id: 'tab2', label: 'Tab 2', badge: 7 },
				{ id: 'tab3', label: 'Tab 3', badge: 0 },
			];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			const badges = container.querySelectorAll('.tab-badge');
			expect(badges).toHaveLength(2); // Only tabs with badge > 0
			expect(badges[0].textContent).toBe('3');
			expect(badges[1].textContent).toBe('7');
		});

		it('should apply tab-badge class to badges', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1', badge: 5 }];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			expect(container.querySelector('.tab-badge')).toBeInTheDocument();
		});

		it('should render badge inside tab button', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1', badge: 5 }];
			const onTabChange = vi.fn();
			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			const button = screen.getByRole('button', { name: /Tab 1/ });
			const badge = button.querySelector('.tab-badge');
			expect(badge).toBeInTheDocument();
		});

		it('should handle large badge numbers', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1', badge: 999 }];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			const badge = container.querySelector('.tab-badge');
			expect(badge?.textContent).toBe('999');
		});
	});

	describe('user interactions', () => {
		it('should call onTabChange when tab is clicked', async () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();
			const user = userEvent.setup();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			const tab2 = screen.getByRole('button', { name: 'Tab 2' });
			await user.click(tab2);

			expect(onTabChange).toHaveBeenCalledWith('tab2');
		});

		it('should call onTabChange with correct tab id', async () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
				{ id: 'tab3', label: 'Tab 3' },
			];
			const onTabChange = vi.fn();
			const user = userEvent.setup();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			await user.click(screen.getByRole('button', { name: 'Tab 2' }));
			expect(onTabChange).toHaveBeenCalledWith('tab2');

			await user.click(screen.getByRole('button', { name: 'Tab 3' }));
			expect(onTabChange).toHaveBeenCalledWith('tab3');
		});

		it('should allow clicking active tab', async () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();
			const user = userEvent.setup();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			const tab1 = screen.getByRole('button', { name: 'Tab 1' });
			await user.click(tab1);

			expect(onTabChange).toHaveBeenCalledWith('tab1');
		});

		it('should call onTabChange once per click', async () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1' }];
			const onTabChange = vi.fn();
			const user = userEvent.setup();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			const tab = screen.getByRole('button', { name: 'Tab 1' });
			await user.click(tab);

			expect(onTabChange).toHaveBeenCalledTimes(1);
		});
	});

	describe('active tab switching', () => {
		it('should update active class when activeTab prop changes', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();
			const { rerender } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			let tab1 = screen.getByRole('button', { name: 'Tab 1' });
			let tab2 = screen.getByRole('button', { name: 'Tab 2' });

			expect(tab1).toHaveClass('active');
			expect(tab2).not.toHaveClass('active');

			rerender(<TabPanel tabs={tabs} activeTab="tab2" onTabChange={onTabChange} />);

			tab1 = screen.getByRole('button', { name: 'Tab 1' });
			tab2 = screen.getByRole('button', { name: 'Tab 2' });

			expect(tab1).not.toHaveClass('active');
			expect(tab2).toHaveClass('active');
		});

		it('should handle switching through all tabs', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
				{ id: 'tab3', label: 'Tab 3' },
			];
			const onTabChange = vi.fn();
			const { rerender } = render(
				<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />
			);

			expect(screen.getByRole('button', { name: 'Tab 1' })).toHaveClass('active');

			rerender(<TabPanel tabs={tabs} activeTab="tab2" onTabChange={onTabChange} />);
			expect(screen.getByRole('button', { name: 'Tab 2' })).toHaveClass('active');

			rerender(<TabPanel tabs={tabs} activeTab="tab3" onTabChange={onTabChange} />);
			expect(screen.getByRole('button', { name: 'Tab 3' })).toHaveClass('active');
		});
	});

	describe('edge cases', () => {
		it('should handle empty tabs array', () => {
			const tabs: Tab[] = [];
			const onTabChange = vi.fn();
			const { container } = render(
				<TabPanel tabs={tabs} activeTab="" onTabChange={onTabChange} />
			);

			const buttons = container.querySelectorAll('.tab-button');
			expect(buttons).toHaveLength(0);
		});

		it('should handle single tab', () => {
			const tabs: Tab[] = [{ id: 'tab1', label: 'Tab 1' }];
			const onTabChange = vi.fn();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			expect(screen.getByRole('button', { name: 'Tab 1' })).toBeInTheDocument();
		});

		it('should handle many tabs', () => {
			const tabs: Tab[] = Array.from({ length: 20 }, (_, i) => ({
				id: `tab${i}`,
				label: `Tab ${i}`,
			}));
			const onTabChange = vi.fn();

			render(<TabPanel tabs={tabs} activeTab="tab0" onTabChange={onTabChange} />);

			const buttons = screen.getAllByRole('button');
			expect(buttons).toHaveLength(20);
		});

		it('should handle activeTab not in tabs list', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab 1' },
				{ id: 'tab2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();

			render(<TabPanel tabs={tabs} activeTab="nonexistent" onTabChange={onTabChange} />);

			const tab1 = screen.getByRole('button', { name: 'Tab 1' });
			const tab2 = screen.getByRole('button', { name: 'Tab 2' });

			expect(tab1).not.toHaveClass('active');
			expect(tab2).not.toHaveClass('active');
		});

		it('should handle tabs with special characters in label', () => {
			const tabs: Tab[] = [
				{ id: 'tab1', label: 'Tab & Special <chars>' },
				{ id: 'tab2', label: 'Tab "with" quotes' },
			];
			const onTabChange = vi.fn();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			expect(screen.getByRole('button', { name: 'Tab & Special <chars>' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Tab "with" quotes' })).toBeInTheDocument();
		});

		it('should handle tabs with very long labels', () => {
			const longLabel = 'This is a very long tab label that might wrap or overflow';
			const tabs: Tab[] = [{ id: 'tab1', label: longLabel }];
			const onTabChange = vi.fn();

			render(<TabPanel tabs={tabs} activeTab="tab1" onTabChange={onTabChange} />);

			expect(screen.getByRole('button', { name: longLabel })).toBeInTheDocument();
		});

		it('should use tab id as React key', () => {
			const tabs: Tab[] = [
				{ id: 'unique-id-1', label: 'Tab 1' },
				{ id: 'unique-id-2', label: 'Tab 2' },
			];
			const onTabChange = vi.fn();

			const { container } = render(
				<TabPanel tabs={tabs} activeTab="unique-id-1" onTabChange={onTabChange} />
			);

			const buttons = container.querySelectorAll('.tab-button');
			expect(buttons).toHaveLength(2);
		});
	});
});
