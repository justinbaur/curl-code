/**
 * Request body editor component — powered by Monaco Editor
 */

import { useCallback, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
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

/** Map body types to Monaco language identifiers */
function bodyTypeToLanguage(type: HttpBody['type']): string {
  switch (type) {
    case 'json':
      return 'json';
    case 'x-www-form-urlencoded':
      return 'plaintext';
    case 'raw':
      return 'plaintext';
    default:
      return 'plaintext';
  }
}

export function BodyEditor({ body, onChange }: BodyEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleTypeChange = (type: HttpBody['type']) => {
    onChange({ ...body, type });
  };

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      onChange({ ...body, content: value ?? '' });
    },
    // body.type is stable across content edits so this won't over-fire
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, body.type]
  );

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const formatJson = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
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
        <div className="body-monaco-wrapper">
          <Editor
            value={body.content}
            language={bodyTypeToLanguage(body.type)}
            theme="vs-dark"
            onChange={handleContentChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: 'on',
              renderLineHighlight: 'none',
              folding: true,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 8 },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
          />
        </div>
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
