/**
 * Tab panel component for switching between views
 */


export interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabPanelProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  rightContent?: React.ReactNode;
}

export function TabPanel({ tabs, activeTab, onTabChange, rightContent }: TabPanelProps) {
  return (
    <div className="tab-panel">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="tab-badge">{tab.badge}</span>
          )}
        </button>
      ))}
      {rightContent && <div className="tab-panel-right">{rightContent}</div>}
    </div>
  );
}
