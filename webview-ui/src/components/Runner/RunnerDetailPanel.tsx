/**
 * Right-panel detail view for a selected runner result.
 * Shows Response, Headers, and Request tabs — similar to Postman's runner detail.
 */

import { useState, useMemo } from 'react';
import type { RunRequestResult } from '../../runner-vscode';
import { escapeHtml, highlightJson } from '../../utils/jsonHighlight';

type DetailTab = 'response' | 'headers' | 'request';

interface RunnerDetailPanelProps {
  result: RunRequestResult;
  resultIndex: number;
  persistResponses: boolean;
  collectionName: string;
  folderName?: string;
}

function formatResponseTime(ms?: number): string {
  if (ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBody(body: string, contentType: string): { html: string | null; text: string } {
  const isJson = contentType.includes('application/json') || contentType.includes('+json');
  const isXml = contentType.includes('xml') || contentType.includes('html');

  if (isJson) {
    try {
      const formatted = JSON.stringify(JSON.parse(body), null, 2);
      return { html: highlightJson(formatted), text: formatted };
    } catch {
      return { html: null, text: body };
    }
  }

  if (isXml) {
    try {
      return { html: null, text: formatXml(body) };
    } catch {
      return { html: null, text: body };
    }
  }

  return { html: null, text: body };
}

function formatXml(xml: string): string {
  let formatted = '';
  let indent = 0;
  const parts = xml.replace(/(>)(<)/g, '$1\n$2').split('\n');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('</')) indent = Math.max(indent - 1, 0);
    formatted += '  '.repeat(indent) + trimmed + '\n';
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
      indent++;
    }
  }
  return formatted.trimEnd();
}

function addLineNumbers(text: string): string {
  return text.split('\n').map((line, i) => {
    const num = String(i + 1).padStart(3, ' ');
    return `<span class="runner-line-number">${escapeHtml(num)}</span>${line}`;
  }).join('\n');
}

function ResponseTab({ result, persistResponses }: { result: RunRequestResult; persistResponses: boolean }) {
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const response = result.response;

  const formatted = useMemo(() => {
    if (!response?.body) return null;
    return formatBody(response.body, response.contentType);
  }, [response?.body, response?.contentType]);

  if (result.status === 'failed' && result.error) {
    return (
      <div className="runner-detail-content">
        <div className="runner-detail-error">
          <span className="runner-detail-error-label">Error</span>
          <pre className="runner-detail-pre runner-detail-error-pre">{result.error}</pre>
        </div>
      </div>
    );
  }

  if (result.status === 'pending' || result.status === 'running') {
    return (
      <div className="runner-detail-content">
        <div className="runner-detail-empty">
          {result.status === 'running' ? 'Request in progress...' : 'Request not yet executed'}
        </div>
      </div>
    );
  }

  if (!response && !persistResponses) {
    return (
      <div className="runner-detail-content">
        <div className="runner-detail-status-bar">
          {result.statusCode && (
            <span className={`runner-detail-status ${(result.statusCode >= 400) ? 'error' : 'success'}`}>
              {result.statusCode} {result.statusText}
            </span>
          )}
          {result.responseTime !== undefined && (
            <span className="runner-detail-timing">{formatResponseTime(result.responseTime)}</span>
          )}
        </div>
        <div className="runner-detail-hint">
          Enable &quot;Persist responses&quot; in run config to see full response body and headers.
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="runner-detail-content">
        <div className="runner-detail-empty">No response data available</div>
      </div>
    );
  }

  const bodyText = viewMode === 'pretty' ? (formatted?.text ?? response.body) : response.body;
  const bodyHtml = viewMode === 'pretty' ? formatted?.html : null;
  const bodyWithLines = bodyHtml
    ? addLineNumbers(bodyHtml)
    : addLineNumbers(escapeHtml(bodyText));

  return (
    <div className="runner-detail-content">
      <div className="runner-detail-status-bar">
        <span className={`runner-detail-status ${(response.status >= 400) ? 'error' : 'success'}`}>
          {response.status} {response.statusText}
        </span>
        <span className="runner-detail-timing">{formatResponseTime(response.time)}</span>
        <span className="runner-detail-size">{formatSize(response.size)}</span>
      </div>
      <div className="runner-detail-toolbar">
        <select
          className="runner-detail-view-select"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as 'pretty' | 'raw')}
        >
          <option value="pretty">Pretty</option>
          <option value="raw">Raw</option>
        </select>
      </div>
      <pre
        className="runner-detail-pre runner-detail-body"
        dangerouslySetInnerHTML={{ __html: bodyWithLines }}
      />
    </div>
  );
}

function HeadersTab({ result }: { result: RunRequestResult }) {
  const response = result.response;

  if (!response) {
    return (
      <div className="runner-detail-content">
        <div className="runner-detail-hint">
          Enable &quot;Persist responses&quot; to see response headers.
        </div>
      </div>
    );
  }

  const headers = Object.entries(response.headers);

  if (headers.length === 0) {
    return (
      <div className="runner-detail-content">
        <div className="runner-detail-empty">No response headers</div>
      </div>
    );
  }

  return (
    <div className="runner-detail-content">
      <table className="runner-detail-headers-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {headers.map(([key, value]) => (
            <tr key={key}>
              <td className="runner-detail-header-key">{key}</td>
              <td className="runner-detail-header-value">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestTab({ result }: { result: RunRequestResult }) {
  return (
    <div className="runner-detail-content">
      <div className="runner-detail-request-info">
        <div className="runner-detail-request-row">
          <span className="runner-detail-request-label">Method</span>
          <span className={`runner-method runner-method-${result.method.toLowerCase()}`}>
            {result.method}
          </span>
        </div>
        <div className="runner-detail-request-row">
          <span className="runner-detail-request-label">URL</span>
          <span className="runner-detail-request-value runner-detail-mono">{result.url}</span>
        </div>
        {result.response?.curlCommand && (
          <div className="runner-detail-request-row runner-detail-request-curl">
            <span className="runner-detail-request-label">cURL</span>
            <pre className="runner-detail-pre runner-detail-curl-pre">{result.response.curlCommand}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function RunnerDetailPanel({ result, resultIndex, persistResponses, collectionName, folderName }: RunnerDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('response');

  const breadcrumb = folderName
    ? `${result.method}  ${collectionName} / ${folderName} / ${result.requestName}`
    : `${result.method}  ${collectionName} / ${result.requestName}`;

  return (
    <div className="runner-detail">
      <div className="runner-detail-header">
        <span className="runner-detail-index">{resultIndex + 1}</span>
        <span className="runner-detail-breadcrumb">
          <span className={`runner-method runner-method-${result.method.toLowerCase()}`}>{result.method}</span>
          {' '}
          {collectionName}
          {folderName && <> / {folderName}</>}
          {' / '}
          <strong>{result.requestName}</strong>
        </span>
      </div>

      <div className="runner-detail-tabs">
        <button
          className={`runner-detail-tab ${activeTab === 'response' ? 'active' : ''}`}
          onClick={() => setActiveTab('response')}
        >
          Response
        </button>
        <button
          className={`runner-detail-tab ${activeTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers
        </button>
        <button
          className={`runner-detail-tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
      </div>

      {activeTab === 'response' && (
        <ResponseTab result={result} persistResponses={persistResponses} />
      )}
      {activeTab === 'headers' && (
        <HeadersTab result={result} />
      )}
      {activeTab === 'request' && (
        <RequestTab result={result} />
      )}
    </div>
  );
}
