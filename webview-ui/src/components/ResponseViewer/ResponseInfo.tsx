/**
 * Response status and timing info component
 */

import type { HttpResponse } from '../../vscode';

interface ResponseInfoProps {
  response: HttpResponse;
}

export function ResponseInfo({ response }: ResponseInfoProps) {
  const getStatusClass = (status: number): string => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'redirect';
    if (status >= 400 && status < 500) return 'client-error';
    return 'server-error';
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="response-info">
      <div className="response-info-item">
        <span className="response-info-label">Status:</span>
        <span className={`status-code ${getStatusClass(response.status)}`}>
          {response.status} {response.statusText}
        </span>
      </div>
      <div className="response-info-item">
        <span className="response-info-label">Time:</span>
        <span>{formatTime(response.time)}</span>
      </div>
      <div className="response-info-item">
        <span className="response-info-label">Size:</span>
        <span>{formatSize(response.size)}</span>
      </div>
    </div>
  );
}
