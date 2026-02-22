/**
 * Main response viewer component
 */

import { useState } from 'react';
import type { HttpResponse } from '../../vscode';
import { TabPanel, type Tab } from '../common/TabPanel';
import { ResponseInfo } from './ResponseInfo';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';

interface ResponseViewerProps {
  response: HttpResponse | null;
  error: string | null;
}

type TabId = 'body' | 'headers' | 'curl';

export function ResponseViewer({ response, error }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('body');

  if (error) {
    return (
      <div className="response-viewer error">
        <div className="error-message">
          <h3>Request Failed</h3>
          <pre>{error}</pre>
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
  ];

  return (
    <div className="response-viewer">
      <ResponseInfo response={response} />

      <TabPanel
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
      />

      <div className="tab-content">
        {activeTab === 'body' && (
          <ResponseBody body={response.body} contentType={response.contentType} />
        )}
        {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
        {activeTab === 'curl' && (
          <div className="curl-command">
            <pre>{response.curlCommand}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
