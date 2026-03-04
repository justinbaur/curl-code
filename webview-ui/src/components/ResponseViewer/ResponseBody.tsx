/**
 * Response body display component
 */

import { useMemo } from 'react';
import { escapeHtml, highlightJson } from '../../utils/jsonHighlight';

interface ResponseBodyProps {
  body: string;
  contentType: string;
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