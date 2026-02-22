/**
 * Response body display component
 */

import { useMemo } from 'react';

interface ResponseBodyProps {
  body: string;
  contentType: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      const safe = escapeHtml(match);
      if (match.startsWith('"')) {
        if (match.trimEnd().endsWith(':')) {
          const colonIdx = safe.lastIndexOf(':');
          return `<span class="json-key">${safe.slice(0, colonIdx)}</span><span class="json-punctuation">:</span>`;
        }
        return `<span class="json-string">${safe}</span>`;
      }
      if (match === 'true' || match === 'false') {
        return `<span class="json-boolean">${safe}</span>`;
      }
      if (match === 'null') {
        return `<span class="json-null">${safe}</span>`;
      }
      return `<span class="json-number">${safe}</span>`;
    }
  );
}

export function ResponseBody({ body, contentType }: ResponseBodyProps) {
  const isJson = contentType.includes('application/json');

  const formattedBody = useMemo(() => {
    if (isJson) {
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return body;
      }
    }
    return body;
  }, [body, isJson]);

  const highlightedBody = useMemo(() => {
    if (isJson) {
      try {
        return highlightJson(formattedBody);
      } catch {
        return escapeHtml(formattedBody);
      }
    }
    return null;
  }, [formattedBody, isJson]);

  if (!body) {
    return (
      <div className="empty-state">
        <p>No response body</p>
      </div>
    );
  }

  return (
    <div className="response-body">
      {highlightedBody ? (
        <pre dangerouslySetInnerHTML={{ __html: highlightedBody }} />
      ) : (
        <pre>{formattedBody}</pre>
      )}
    </div>
  );
}