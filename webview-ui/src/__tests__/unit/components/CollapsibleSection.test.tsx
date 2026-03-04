import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from '../../../components/common/CollapsibleSection';

describe('CollapsibleSection', () => {
	it('should render title', () => {
		render(
			<CollapsibleSection title="Test Section">
				<p>Content</p>
			</CollapsibleSection>
		);

		expect(screen.getByText('Test Section')).toBeInTheDocument();
	});

	it('should hide children when collapsed (default)', () => {
		render(
			<CollapsibleSection title="Test Section">
				<p>Hidden Content</p>
			</CollapsibleSection>
		);

		expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
	});

	it('should show children when defaultOpen is true', () => {
		render(
			<CollapsibleSection title="Test Section" defaultOpen={true}>
				<p>Visible Content</p>
			</CollapsibleSection>
		);

		expect(screen.getByText('Visible Content')).toBeInTheDocument();
	});

	it('should toggle children on header click', async () => {
		const user = userEvent.setup();
		render(
			<CollapsibleSection title="Test Section">
				<p>Toggle Content</p>
			</CollapsibleSection>
		);

		// Initially hidden
		expect(screen.queryByText('Toggle Content')).not.toBeInTheDocument();

		// Click to open
		await user.click(screen.getByText('Test Section'));
		expect(screen.getByText('Toggle Content')).toBeInTheDocument();

		// Click to close
		await user.click(screen.getByText('Test Section'));
		expect(screen.queryByText('Toggle Content')).not.toBeInTheDocument();
	});

	it('should show badge when provided and greater than 0', () => {
		render(
			<CollapsibleSection title="Test Section" badge={3}>
				<p>Content</p>
			</CollapsibleSection>
		);

		expect(screen.getByText('3')).toBeInTheDocument();
	});

	it('should not show badge when 0', () => {
		render(
			<CollapsibleSection title="Test Section" badge={0}>
				<p>Content</p>
			</CollapsibleSection>
		);

		// Title should exist but no badge number
		expect(screen.getByText('Test Section')).toBeInTheDocument();
		expect(screen.queryByText('0')).not.toBeInTheDocument();
	});

	it('should not show badge when undefined', () => {
		const { container } = render(
			<CollapsibleSection title="Test Section">
				<p>Content</p>
			</CollapsibleSection>
		);

		expect(container.querySelector('.collapsible-badge')).not.toBeInTheDocument();
	});
});
