/**
 * Main Runner App component — Postman-style split-pane layout
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { runnerVscode } from './runner-vscode';
import type { RunnerRequestInfo, RunRequestResult, RunState, RunSummary } from './runner-vscode';
import { RunnerConfig } from './components/Runner/RunnerConfig';
import { RunnerProgress } from './components/Runner/RunnerProgress';
import { RunnerResultsTable } from './components/Runner/RunnerResultsTable';
import { RunnerSummary, type ResultFilter } from './components/Runner/RunnerSummary';
import { RunnerDetailPanel } from './components/Runner/RunnerDetailPanel';

type Phase = 'config' | 'running' | 'completed';

export function RunnerApp() {
  const [phase, setPhase] = useState<Phase>('config');
  const [availableRequests, setAvailableRequests] = useState<RunnerRequestInfo[]>([]);
  const [activeEnvironmentName, setActiveEnvironmentName] = useState<string | undefined>();
  const [collectionName, setCollectionName] = useState('');
  const [folderName, setFolderName] = useState<string | undefined>();

  const [results, setResults] = useState<RunRequestResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [persistResponses, setPersistResponses] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<ResultFilter>('all');

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'runnerLoadRequests':
        setAvailableRequests(message.requests);
        setActiveEnvironmentName(message.activeEnvironmentName);
        setCollectionName(message.collectionName);
        setFolderName(message.folderName);
        setPhase('config');
        break;

      case 'runnerInit': {
        const state = message.state as RunState;
        setResults(state.requests);
        setCurrentIndex(state.currentIndex);
        setTotalRequests(state.requests.length);
        setStartTime(state.startTime);
        setPersistResponses(state.config.persistResponses);
        setSelectedIndex(null);
        setActiveFilter('all');
        setPhase('running');
        break;
      }

      case 'runnerRequestStarted':
        setCurrentIndex(message.index);
        setResults(prev => {
          const updated = [...prev];
          if (updated[message.index]) {
            updated[message.index] = { ...updated[message.index], status: 'running' };
          }
          return updated;
        });
        break;

      case 'runnerRequestCompleted':
        setResults(prev => {
          const updated = [...prev];
          updated[message.index] = message.result;
          return updated;
        });
        // Auto-select the first completed result
        setSelectedIndex(prev => prev === null ? message.index : prev);
        break;

      case 'runnerCompleted':
        setSummary(message.summary);
        setPhase('completed');
        break;

      case 'runnerCancelled':
        setPhase('completed');
        break;
    }
  }, []);

  useEffect(() => {
    runnerVscode.postMessage({ type: 'runnerReady' });
    const unsubscribe = runnerVscode.onMessage(handleMessage);
    return unsubscribe;
  }, [handleMessage]);

  const handleCancel = () => {
    runnerVscode.postMessage({ type: 'runnerCancel' });
  };

  const handleViewRequest = (requestId: string) => {
    runnerVscode.postMessage({ type: 'runnerViewRequest', requestId });
  };

  const handleRunAgain = () => {
    setSummary(null);
    setResults([]);
    setCurrentIndex(-1);
    setSelectedIndex(null);
    runnerVscode.postMessage({ type: 'runnerRerun' });
  };

  const handleNewConfig = () => {
    setSummary(null);
    setResults([]);
    setCurrentIndex(-1);
    setSelectedIndex(null);
    runnerVscode.postMessage({ type: 'runnerNewConfig' });
    setPhase('config');
  };

  // Filter results based on active filter
  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter(r => r.status === activeFilter);
  }, [results, activeFilter]);

  // Map filtered index back to original index
  const filteredToOriginalIndex = useMemo(() => {
    if (activeFilter === 'all') return filteredResults.map((_, i) => i);
    const mapping: number[] = [];
    results.forEach((r, i) => {
      if (r.status === activeFilter) mapping.push(i);
    });
    return mapping;
  }, [results, filteredResults, activeFilter]);

  const selectedResult = selectedIndex !== null ? results[selectedIndex] : null;

  const handleSelectResult = (filteredIdx: number) => {
    setSelectedIndex(filteredToOriginalIndex[filteredIdx]);
  };

  return (
    <div className="runner-app">
      {phase === 'config' && (
        <RunnerConfig
          requests={availableRequests}
          activeEnvironmentName={activeEnvironmentName}
          collectionName={collectionName}
          folderName={folderName}
        />
      )}

      {(phase === 'running' || phase === 'completed') && (
        <div className="runner-results-layout">
          {/* Top: Progress or Summary bar */}
          {phase === 'running' && (
            <RunnerProgress
              currentIndex={currentIndex}
              totalRequests={totalRequests}
              startTime={startTime}
              onCancel={handleCancel}
            />
          )}

          {phase === 'completed' && summary && (
            <RunnerSummary
              summary={summary}
              collectionName={collectionName}
              folderName={folderName}
              environmentName={activeEnvironmentName}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              onRunAgain={handleRunAgain}
              onNewConfig={handleNewConfig}
            />
          )}

          {/* Split pane: left list + right detail */}
          <div className="runner-split-pane">
            <div className="runner-split-left">
              <RunnerResultsTable
                results={filteredResults}
                selectedIndex={selectedIndex !== null
                  ? filteredToOriginalIndex.indexOf(selectedIndex)
                  : null
                }
                onSelectResult={handleSelectResult}
                onViewRequest={handleViewRequest}
              />
            </div>
            <div className="runner-split-right">
              {selectedResult ? (
                <RunnerDetailPanel
                  result={selectedResult}
                  resultIndex={selectedIndex!}
                  persistResponses={persistResponses}
                  collectionName={collectionName}
                  folderName={folderName}
                />
              ) : (
                <div className="runner-detail-placeholder">
                  Select a request to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
