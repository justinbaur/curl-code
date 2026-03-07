/**
 * Pre-run configuration panel
 */

import { useState } from 'react';
import { runnerVscode } from '../../runner-vscode';
import type { RunnerRequestInfo, RunConfig } from '../../runner-vscode';

interface RunnerConfigProps {
  requests: RunnerRequestInfo[];
  activeEnvironmentName?: string;
  collectionName: string;
  folderName?: string;
}

export function RunnerConfig({ requests, activeEnvironmentName, collectionName, folderName }: RunnerConfigProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(requests.map(r => r.id))
  );
  const [delayMs, setDelayMs] = useState(0);
  const [stopOnError, setStopOnError] = useState(false);
  const [persistResponses, setPersistResponses] = useState(false);

  const allSelected = selectedIds.size === requests.length;
  const noneSelected = selectedIds.size === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  const toggleRequest = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStart = () => {
    const config: RunConfig = {
      delayMs,
      stopOnError,
      persistResponses,
      collectionId: '',
      collectionName,
      folderName,
      selectedRequestIds: Array.from(selectedIds),
    };
    runnerVscode.postMessage({ type: 'runnerStart', config });
  };

  return (
    <div className="runner-config">
      <h2 className="runner-config-title">
        Run: {collectionName}{folderName ? ` / ${folderName}` : ''}
      </h2>

      {activeEnvironmentName && (
        <div className="runner-config-env">
          <span className="runner-config-env-label">Environment:</span>
          <span className="runner-config-env-value">{activeEnvironmentName}</span>
        </div>
      )}

      <div className="runner-config-options">
        <label className="runner-config-option">
          <span>Delay between requests (ms)</span>
          <input
            type="number"
            min="0"
            step="100"
            value={delayMs}
            onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
            className="runner-config-input"
          />
        </label>

        <label className="runner-config-option runner-config-checkbox">
          <input
            type="checkbox"
            checked={stopOnError}
            onChange={(e) => setStopOnError(e.target.checked)}
          />
          <span>Stop on error</span>
        </label>

        <label className="runner-config-option runner-config-checkbox">
          <input
            type="checkbox"
            checked={persistResponses}
            onChange={(e) => setPersistResponses(e.target.checked)}
          />
          <span>Persist responses</span>
        </label>
      </div>

      <div className="runner-config-requests">
        <div className="runner-config-requests-header">
          <label className="runner-config-checkbox">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span>Select All ({selectedIds.size}/{requests.length})</span>
          </label>
        </div>

        <div className="runner-config-request-list">
          {requests.map((req) => (
            <label key={req.id} className="runner-config-request-item">
              <input
                type="checkbox"
                checked={selectedIds.has(req.id)}
                onChange={() => toggleRequest(req.id)}
              />
              <span className={`runner-method runner-method-${req.method.toLowerCase()}`}>
                {req.method}
              </span>
              <span className="runner-request-name">{req.name}</span>
              <span className="runner-request-url">{req.url}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        className="runner-start-btn"
        onClick={handleStart}
        disabled={noneSelected}
      >
        Start Run ({selectedIds.size} request{selectedIds.size !== 1 ? 's' : ''})
      </button>
    </div>
  );
}
