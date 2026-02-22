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
  // SECURITY: Escape the ENTIRE string first so that any non-JSON content
  // (e.g. HTML tags in a malformed response) is neutralised before we inject
  // highlighting <span> elements via dangerouslySetInnerHTML.
  const escaped = escapeHtml(json);
  return escaped.replace(
    /("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (match.startsWith('"')) {
        if (match.trimEnd().endsWith(':')) {
          const colonIdx = match.lastIndexOf(':');
          return `<span class="json-key">${match.slice(0, colonIdx)}</span><span class="json-punctuation">:</span>`;
        }
        return `<span class="json-string">${match}</span>`;
      }
      if (match === 'true' || match === 'false') {
        return `<span class="json-boolean">${match}</span>`;
      }
      if (match === 'null') {
        return `<span class="json-null">${match}</span>`;
      }
      return `<span class="json-number">${match}</span>`;
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