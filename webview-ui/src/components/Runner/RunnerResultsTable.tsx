/**
 * Left-panel request list for the runner results split view
 */

import type { RunRequestResult } from '../../runner-vscode';

interface RunnerResultsTableProps {
  results: RunRequestResult[];
  selectedIndex: number | null;
  onSelectResult: (index: number) => void;
  onViewRequest: (requestId: string) => void;
}

function StatusIcon({ status }: { status: RunRequestResult['status'] }) {
  switch (status) {
    case 'passed':
      return <span className="runner-status-icon runner-status-passed" title="Passed">&#10003;</span>;
    case 'failed':
      return <span className="runner-status-icon runner-status-failed" title="Failed">&#10007;</span>;
    case 'skipped':
      return <span className="runner-status-icon runner-status-skipped" title="Skipped">&#8212;</span>;
    case 'running':
      return <span className="runner-status-icon runner-status-running" title="Running">&#9679;</span>;
    case 'pending':
    default:
      return <span className="runner-status-icon runner-status-pending" title="Pending">&#9675;</span>;
  }
}

function formatResponseTime(ms?: number): string {
  if (ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function RunnerResultsTable({ results, selectedIndex, onSelectResult, onViewRequest }: RunnerResultsTableProps) {
  return (
    <div className="runner-results-list">
      {results.map((result, index) => (
        <div
          key={`${result.requestId}-${index}`}
          className={`runner-result-item ${selectedIndex === index ? 'selected' : ''} ${result.status === 'running' ? 'running' : ''}`}
          onClick={() => onSelectResult(index)}
        >
          <StatusIcon status={result.status} />
          <span className={`runner-method runner-method-${result.method.toLowerCase()}`}>
            {result.method}
          </span>
          <div className="runner-result-info">
            <span className="runner-result-name">{result.requestName}</span>
            <span className="runner-result-url">{result.url}</span>
          </div>
          <div className="runner-result-meta">
            {result.statusCode && (
              <span className={`runner-result-status-code ${(result.statusCode >= 400) ? 'error' : ''}`}>
                {result.statusCode}
              </span>
            )}
            {result.responseTime !== undefined && (
              <span className="runner-result-time">{formatResponseTime(result.responseTime)}</span>
            )}
          </div>
          <button
            className="runner-result-open-btn"
            title="Open in Builder"
            onClick={(e) => {
              e.stopPropagation();
              onViewRequest(result.requestId);
            }}
          >
            &#8599;
          </button>
        </div>
      ))}
      {results.length === 0 && (
        <div className="runner-results-empty">No results yet</div>
      )}
    </div>
  );
}
