/**
 * Response body display component
 */

import { useMemo } from 'react';

interface ResponseBodyProps {
  body: string;
  contentType: string;
}

export function ResponseBody({ body, contentType }: ResponseBodyProps) {
  const formattedBody = useMemo(() => {
    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return body;
      }
    }
    return body;
  }, [body, contentType]);

  if (!body) {
    return (
      <div className="empty-state">
        <p>No response body</p>
      </div>
    );
  }

  return (
    <div className="response-body">
      <pre>{formattedBody}</pre>
    </div>
  );
}
