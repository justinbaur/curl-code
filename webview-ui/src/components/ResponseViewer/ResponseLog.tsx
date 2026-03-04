/**
 * Response debug/verbose log display component
 */

interface ResponseLogProps {
  log: string | undefined;
}

function getLineClass(line: string): string {
  if (line.startsWith('* ')) return 'log-line-info';
  if (line.startsWith('> ')) return 'log-line-request';
  if (line.startsWith('< ')) return 'log-line-response';
  return 'log-line-default';
}

export function ResponseLog({ log }: ResponseLogProps) {
  if (!log) {
    return (
      <div className="response-log-empty">
        <p>No debug output available</p>
        <p className="response-log-hint">
          Enable <strong>--verbose</strong> in the Advanced tab to capture connection details, TLS handshake info, and request/response headers.
        </p>
      </div>
    );
  }

  const lines = log.split('\n');

  return (
    <div className="response-log">
      <pre>
        {lines.map((line, i) => (
          <span key={i} className={getLineClass(line)}>
            {line}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        ))}
      </pre>
    </div>
  );
}
