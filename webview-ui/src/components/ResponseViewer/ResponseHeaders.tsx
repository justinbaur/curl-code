/**
 * Response headers display component
 */


interface ResponseHeadersProps {
  headers: Record<string, string>;
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
  const headerEntries = Object.entries(headers);

  if (headerEntries.length === 0) {
    return (
      <div className="empty-state">
        <p>No response headers</p>
      </div>
    );
  }

  return (
    <div className="response-headers">
      {headerEntries.map(([key, value]) => (
        <div key={key} className="response-header">
          <span className="response-header-key">{key}</span>
          <span className="response-header-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
