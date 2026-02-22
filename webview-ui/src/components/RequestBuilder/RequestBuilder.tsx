/**
 * Main request builder component
 */

import { useState } from 'react';
import type { HttpRequest } from '../../vscode';
import { MethodSelector } from './MethodSelector';
import { UrlBar } from './UrlBar';
import { TabPanel, type Tab } from '../common/TabPanel';
import { QueryParamsEditor } from './QueryParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { AuthEditor } from './AuthEditor';

interface RequestBuilderProps {
  request: HttpRequest;
  onChange: (request: HttpRequest) => void;
  onSend: () => void;
  onSave: () => void;
  onCopyAsCurl: () => void;
  isLoading: boolean;
}

type TabId = 'params' | 'headers' | 'body' | 'auth';

export function RequestBuilder({
  request,
  onChange,
  onSend,
  onSave,
  onCopyAsCurl,
  isLoading,
}: RequestBuilderProps) {
  const [activeTab, setActiveTab] = useState<TabId>('params');

  const handleMethodChange = (method: HttpRequest['method']) => {
    onChange({ ...request, method });
  };

  const handleUrlChange = (url: string) => {
    onChange({ ...request, url });
  };

  const handleNameChange = (name: string) => {
    onChange({ ...request, name });
  };

  const tabs: Tab[] = [
    {
      id: 'params',
      label: 'Params',
      badge: request.queryParams.filter((p) => p.enabled).length,
    },
    {
      id: 'headers',
      label: 'Headers',
      badge: request.headers.filter((h) => h.enabled).length,
    },
    {
      id: 'body',
      label: 'Body',
      badge: request.body.type !== 'none' ? 1 : 0,
    },
    {
      id: 'auth',
      label: 'Auth',
      badge: request.auth.type !== 'none' ? 1 : 0,
    },
  ];

  return (
    <div className="request-builder">
      <div className="request-name">
        <input
          type="text"
          className="name-input"
          value={request.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Request Name"
        />
      </div>

      <div className="url-row">
        <MethodSelector value={request.method} onChange={handleMethodChange} />
        <UrlBar
          value={request.url}
          onChange={handleUrlChange}
        />
        <button
          type="button"
          className="send-button btn-primary"
          onClick={onSend}
          disabled={isLoading || !request.url}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className="toolbar">
        <button type="button" className="toolbar-button toolbar-button--primary" onClick={onSave}>
          <i className="codicon codicon-save" />
          Save
        </button>
        <button type="button" className="toolbar-button" onClick={onCopyAsCurl}>
          Copy as cURL
        </button>
      </div>

      <TabPanel
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
      />

      <div className="tab-content">
        {activeTab === 'params' && (
          <QueryParamsEditor
            params={request.queryParams}
            onChange={(queryParams) => onChange({ ...request, queryParams })}
          />
        )}
        {activeTab === 'headers' && (
          <HeadersEditor
            headers={request.headers}
            onChange={(headers) => onChange({ ...request, headers })}
          />
        )}
        {activeTab === 'body' && (
          <BodyEditor
            body={request.body}
            onChange={(body) => onChange({ ...request, body })}
          />
        )}
        {activeTab === 'auth' && (
          <AuthEditor
            auth={request.auth}
            onChange={(auth) => onChange({ ...request, auth })}
          />
        )}
      </div>
    </div>
  );
}
