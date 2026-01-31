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

export function MethodSelector({ value, onChange }: MethodSelectorProps) {
  const getMethodClass = (method: HttpMethod): string => {
    return `method-${method.toLowerCase()}`;
  };

  return (
    <div className="method-selector">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as HttpMethod)}
        className={getMethodClass(value)}
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
