/**
 * HTTP method selector dropdown
 */

import type { HttpRequest } from '../../vscode';

type HttpMethod = HttpRequest['method'];

interface MethodSelectorProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
};

export function MethodSelector({ value, onChange }: MethodSelectorProps) {
  return (
    <div
      className="method-selector"
      style={{ '--method-color': METHOD_COLORS[value] } as React.CSSProperties}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as HttpMethod)}
        className={`method-${value.toLowerCase()}`}
      >
        {METHODS.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>
    </div>
  );
}
