/**
 * Main App component for curl-code webview
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { vscode } from './vscode';
import { useRequestStore } from './state/requestStore';
import { useResponseStore } from './state/responseStore';
import { useEnvironmentStore } from './state/environmentStore';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { EnvironmentPicker } from './components/common/EnvironmentPicker';

type Layout = 'horizontal' | 'vertical';

export default function App() {
  const { request, setRequest, isLoading, setLoading } = useRequestStore();
  const { response, error, setResponse, setError, clearResponse } =
    useResponseStore();
  const { setEnvironments } = useEnvironmentStore();
  const [isDirty, setIsDirty] = useState(false);
  const [layout, setLayout] = useState<Layout>('horizontal');
  const [splitRatio, setSplitRatio] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let ratio: number;
    if (layout === 'horizontal') {
      ratio = ((e.clientY - rect.top) / rect.height) * 100;
    } else {
      ratio = ((e.clientX - rect.left) / rect.width) * 100;
    }
    setSplitRatio(Math.min(80, Math.max(20, ratio)));
  }, [layout]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = layout === 'horizontal' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [layout, handleMouseMove, handleMouseUp]);

  const toggleLayout = () => {
    setLayout((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  };

  useEffect(() => {
    // Notify extension that webview is ready
    vscode.postMessage({ type: 'ready' });

    // Listen for messages from extension
    const unsubscribe = vscode.onMessage((message) => {
      switch (message.type) {
        case 'loadRequest':
          setRequest(message.request);
          setIsDirty(false);
          clearResponse();
          break;
        case 'responseReceived':
          setResponse(message.response);
          setLoading(false);
          break;
        case 'requestError':
          setError(message.error);
          setLoading(false);
          break;
        case 'requestStarted':
          setLoading(true);
          clearResponse();
          break;
        case 'requestCancelled':
          setLoading(false);
          break;
        case 'requestSaved':
          setIsDirty(false);
          break;
        case 'loadEnvironments':
          setEnvironments(message.environments, message.activeId);
          break;
      }
    });

    return unsubscribe;
  }, [setRequest, setResponse, setError, setLoading, clearResponse, setEnvironments]);

  const handleChange = (updated: Parameters<typeof setRequest>[0]) => {
    setRequest(updated);
    setIsDirty(true);
  };

  const handleSend = () => {
    if (request) {
      vscode.postMessage({ type: 'sendRequest', request });
    }
  };

  const handleSave = () => {
    if (request) {
      vscode.postMessage({ type: 'saveRequest', request });
    }
  };

  const handleSaveAs = () => {
    if (request) {
      vscode.postMessage({ type: 'saveRequest', request, saveAs: true });
    }
  };

  const handleCancel = () => {
    vscode.postMessage({ type: 'cancelRequest' });
    setLoading(false);
  };

  const handleCopyAsCurl = () => {
    if (request) {
      vscode.postMessage({ type: 'copyAsCurl', request });
    }
  };

  if (!request) {
    return (
      <div className="app-container">
        <div className="empty-state">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const sizeProp = layout === 'horizontal' ? 'height' : 'width';

  return (
    <div className="app-container">
      <div className="app-top-bar">
        <EnvironmentPicker />
        <button
          className="layout-toggle btn-icon"
          onClick={toggleLayout}
          title={layout === 'horizontal' ? 'Switch to side-by-side layout' : 'Switch to stacked layout'}
        >
          {layout === 'horizontal' ? '\u2B0C' : '\u2B0D'}
        </button>
      </div>
      <div className={`panels-container ${layout}`} ref={containerRef}>
        <div
          className="request-panel"
          style={{ [sizeProp]: `calc(${splitRatio}% - 3px)` }}
        >
          <RequestBuilder
            request={request}
            onChange={handleChange}
            onSend={handleSend}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onCopyAsCurl={handleCopyAsCurl}
            isLoading={isLoading}
            isDirty={isDirty}
          />
        </div>
        <div
          className={`resize-handle ${layout}`}
          onMouseDown={handleResizeStart}
        />
        <div
          className="response-panel"
          style={{ [sizeProp]: `calc(${100 - splitRatio}% - 3px)` }}
        >
          {isLoading ? (
            <LoadingSpinner onCancel={handleCancel} />
          ) : (
            <ResponseViewer response={response} error={error} />
          )}
        </div>
      </div>
    </div>
  );
}
