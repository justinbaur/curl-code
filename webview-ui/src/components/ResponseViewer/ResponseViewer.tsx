/**
 * Main response viewer component
 */

import { useState, useCallback } from 'react';
import type { HttpResponse } from '../../vscode';
import { TabPanel, type Tab } from '../common/TabPanel';
import { ResponseInfo } from './ResponseInfo';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';
import { ResponseLog } from './ResponseLog';

interface ResponseViewerProps {
  response: HttpResponse | null;
  error: string | null;
  errorTime?: number | null;
}

type TabId = 'body' | 'headers' | 'curl' | 'log';

/** Return the plain-text content for the currently active tab. */
function getTabCopyText(tab: TabId, response: HttpResponse): string {
  switch (tab) {
    case 'body':
      return response.body;
    case 'headers':
      return Object.entries(response.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    case 'curl':
      return response.curlCommand;
    case 'log':
      return response.debugLog ?? '';
  }
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function ResponseViewer({ response, error, errorTime }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('body');
  const [wordWrap, setWordWrap] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy');

  const handleCopy = useCallback(async () => {
    if (!response) return;
    const text = getTabCopyText(activeTab, response);
    await navigator.clipboard.writeText(text);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy'), 1500);
  }, [activeTab, response]);

  if (error) {
    return (
      <div className="response-viewer">
        <div className="response-info">
          <span className="status-code server-error">Failed</span>
          {errorTime != null && (
            <>
              <span className="response-info-separator" />
              <div className="response-info-item">
                <span className="response-info-label">Time</span>
                <span className="response-info-value">{formatTime(errorTime)}</span>
              </div>
            </>
          )}
        </div>
        <div className="tab-content">
          <ResponseLog log={error} />
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-viewer empty">
        <div className="empty-state">
          <div className="empty-state-icon">📡</div>
          <p>Send a request to see the response</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            Click Send
          </p>
        </div>
      </div>
    );
  }

  const tabs: Tab[] = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', badge: Object.keys(response.headers).length },
    { id: 'curl', label: 'cURL' },
    { id: 'log', label: 'Log', badge: response.debugLog ? 1 : undefined },
  ];

  return (
    <div className="response-viewer">
      <ResponseInfo response={response} />

      <TabPanel
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        rightContent={
          <>
            {activeTab === 'body' && (
              <label className="wrap-toggle">
                <input
                  type="checkbox"
                  checked={wordWrap}
                  onChange={(e) => setWordWrap(e.target.checked)}
                />
                Wrap Text
              </label>
            )}
            <button
              type="button"
              className="copy-response-button"
              onClick={handleCopy}
            >
              {copyLabel}
            </button>
          </>
        }
      />

      <div className="tab-content">
        {activeTab === 'body' && (
          <ResponseBody body={response.body} contentType={response.contentType} wordWrap={wordWrap} />
        )}
        {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
        {activeTab === 'curl' && (
          <div className="curl-command">
            <pre>{response.curlCommand}</pre>
          </div>
        )}
        {activeTab === 'log' && <ResponseLog log={response.debugLog} />}
      </div>
    </div>
  );
}
