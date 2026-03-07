/**
 * Summary bar shown after runner completes — Postman-style metadata bar with filter tabs
 */

import type { RunSummary, RunRequestResult } from '../../runner-vscode';

export type ResultFilter = 'all' | 'passed' | 'failed' | 'skipped';

interface RunnerSummaryProps {
  summary: RunSummary;
  collectionName: string;
  folderName?: string;
  environmentName?: string;
  activeFilter: ResultFilter;
  onFilterChange: (filter: ResultFilter) => void;
  onRunAgain: () => void;
  onNewConfig: () => void;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(1);
  return `${minutes}m ${remainingSeconds}s`;
}

export function RunnerSummary({
  summary,
  collectionName,
  folderName,
  environmentName,
  activeFilter,
  onFilterChange,
  onRunAgain,
  onNewConfig,
}: RunnerSummaryProps) {
  const title = folderName
    ? `${collectionName} / ${folderName}`
    : collectionName;

  return (
    <div className="runner-summary">
      <div className="runner-summary-top">
        <h2 className="runner-summary-title">{title} - Run Results</h2>
        <div className="runner-summary-actions">
          <button className="runner-summary-btn runner-summary-btn-primary" onClick={onRunAgain}>
            Run Again
          </button>
          <button className="runner-summary-btn runner-summary-btn-secondary" onClick={onNewConfig}>
            New Run
          </button>
        </div>
      </div>

      <div className="runner-summary-meta">
        <div className="runner-summary-meta-item">
          <span className="runner-summary-meta-label">Source</span>
          <span className="runner-summary-meta-value">Runner</span>
        </div>
        {environmentName && (
          <div className="runner-summary-meta-item">
            <span className="runner-summary-meta-label">Environment</span>
            <span className="runner-summary-meta-value">{environmentName}</span>
          </div>
        )}
        <div className="runner-summary-meta-item">
          <span className="runner-summary-meta-label">Duration</span>
          <span className="runner-summary-meta-value">{formatTime(summary.totalTime)}</span>
        </div>
        <div className="runner-summary-meta-item">
          <span className="runner-summary-meta-label">Avg. Resp. Time</span>
          <span className="runner-summary-meta-value">{formatTime(summary.avgResponseTime)}</span>
        </div>
      </div>

      <div className="runner-summary-filters">
        <button
          className={`runner-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          All Requests
        </button>
        <button
          className={`runner-filter-tab runner-filter-passed ${activeFilter === 'passed' ? 'active' : ''}`}
          onClick={() => onFilterChange('passed')}
        >
          Passed ({summary.passed})
        </button>
        <button
          className={`runner-filter-tab runner-filter-failed ${activeFilter === 'failed' ? 'active' : ''}`}
          onClick={() => onFilterChange('failed')}
        >
          Failed ({summary.failed})
        </button>
        {summary.skipped > 0 && (
          <button
            className={`runner-filter-tab runner-filter-skipped ${activeFilter === 'skipped' ? 'active' : ''}`}
            onClick={() => onFilterChange('skipped')}
          >
            Skipped ({summary.skipped})
          </button>
        )}
      </div>
    </div>
  );
}
