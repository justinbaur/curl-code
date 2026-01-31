/**
 * Authentication editor component
 */

import type { HttpAuth } from '../../vscode';

interface AuthEditorProps {
  auth: HttpAuth;
  onChange: (auth: HttpAuth) => void;
}

const AUTH_TYPES: { value: HttpAuth['type']; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
];

export function AuthEditor({ auth, onChange }: AuthEditorProps) {
  const handleTypeChange = (type: HttpAuth['type']) => {
    onChange({ type });
  };

  const handleFieldChange = (field: keyof HttpAuth, value: string) => {
    onChange({ ...auth, [field]: value });
  };

  return (
    <div className="auth-editor">
      <div className="auth-type-selector">
        <select
          value={auth.type}
          onChange={(e) => handleTypeChange(e.target.value as HttpAuth['type'])}
        >
          {AUTH_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="auth-fields">
        {auth.type === 'basic' && (
          <>
            <div className="auth-field">
              <label>Username</label>
              <input
                type="text"
                value={auth.username || ''}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={auth.password || ''}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                placeholder="Password"
              />
            </div>
          </>
        )}

        {auth.type === 'bearer' && (
          <div className="auth-field">
            <label>Token</label>
            <input
              type="text"
              value={auth.token || ''}
              onChange={(e) => handleFieldChange('token', e.target.value)}
              placeholder="Bearer token"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        )}

        {auth.type === 'api-key' && (
          <>
            <div className="auth-field">
              <label>Key Name</label>
              <input
                type="text"
                value={auth.apiKeyName || ''}
                onChange={(e) => handleFieldChange('apiKeyName', e.target.value)}
                placeholder="X-API-Key"
              />
            </div>
            <div className="auth-field">
              <label>Key Value</label>
              <input
                type="password"
                value={auth.apiKeyValue || ''}
                onChange={(e) => handleFieldChange('apiKeyValue', e.target.value)}
                placeholder="API key value"
              />
            </div>
            <div className="auth-field">
              <label>Add to</label>
              <select
                value={auth.apiKeyLocation || 'header'}
                onChange={(e) =>
                  handleFieldChange('apiKeyLocation', e.target.value)
                }
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
