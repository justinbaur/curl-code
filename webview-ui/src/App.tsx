/**
 * Main App component for curl-code webview
 */

import { useEffect } from 'react';
import { vscode } from './vscode';
import { useRequestStore } from './state/requestStore';
import { useResponseStore } from './state/responseStore';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer/ResponseViewer';
import { LoadingSpinner } from './components/common/LoadingSpinner';

export default function App() {
  const { request, setRequest, isLoading, setLoading } = useRequestStore();
  const { response, error, setResponse, setError, clearResponse } =
    useResponseStore();

  useEffect(() => {
    // Notify extension that webview is ready
    vscode.postMessage({ type: 'ready' });

    // Listen for messages from extension
    const unsubscribe = vscode.onMessage((message) => {
      switch (message.type) {
        case 'loadRequest':
          setRequest(message.request);
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
      }
    });

    return unsubscribe;
  }, [setRequest, setResponse, setError, setLoading, clearResponse]);

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

  return (
    <div className="app-container">
      <div className="request-panel">
        <RequestBuilder
          request={request}
          onChange={setRequest}
          onSend={handleSend}
          onSave={handleSave}
          onCopyAsCurl={handleCopyAsCurl}
          isLoading={isLoading}
        />
      </div>
      <div className="response-panel">
        {isLoading ? (
          <LoadingSpinner onCancel={handleCancel} />
        ) : (
          <ResponseViewer response={response} error={error} />
        )}
      </div>
    </div>
  );
}
