/**
 * Request body editor component
 */

import type { HttpBody } from '../../vscode';

interface BodyEditorProps {
  body: HttpBody;
  onChange: (body: HttpBody) => void;
}

const BODY_TYPES: { value: HttpBody['type']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw' },
  { value: 'x-www-form-urlencoded', label: 'Form URL Encoded' },
  { value: 'form-data', label: 'Form Data' },
];

export function BodyEditor({ body, onChange }: BodyEditorProps) {
  const handleTypeChange = (type: HttpBody['type']) => {
    onChange({ ...body, type });
  };

  const handleContentChange = (content: string) => {
    onChange({ ...body, content });
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(body.content);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange({ ...body, content: formatted });
    } catch {
      // Invalid JSON, do nothing
    }
  };

  return (
    <div className="body-editor">
      <div className="body-type-selector">
        <select
          value={body.type}
          onChange={(e) => handleTypeChange(e.target.value as HttpBody['type'])}
        >
          {BODY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {body.type === 'json' && (
          <button
            type="button"
            className="btn-icon"
            onClick={formatJson}
            style={{ marginLeft: 8 }}
            title="Format JSON"
          >
            Format
          </button>
        )}
      </div>

      {body.type !== 'none' && body.type !== 'form-data' && (
        <textarea
          value={body.content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={
            body.type === 'json'
              ? '{\n  "key": "value"\n}'
              : body.type === 'x-www-form-urlencoded'
              ? 'key=value&key2=value2'
              : 'Enter request body'
          }
          spellCheck={false}
        />
      )}

      {body.type === 'form-data' && (
        <div className="form-data-notice">
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Form data editing is not yet supported in the UI.
            You can use the JSON or Raw body types for now.
          </p>
        </div>
      )}
    </div>
  );
}
