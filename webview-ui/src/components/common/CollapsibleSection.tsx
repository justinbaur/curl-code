/**
 * Reusable collapsible section component
 */

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: number;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className={`codicon codicon-chevron-right collapsible-chevron${isOpen ? ' open' : ''}`} />
        <span>{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="collapsible-badge">{badge}</span>
        )}
      </button>
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
}
