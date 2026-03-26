/**
 * Request body editor component — powered by Monaco Editor
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { vscode, type HttpBody } from '../../vscode';

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

interface ContextMenuState {
  x: number;
  y: number;
  hasSelection: boolean;
}

export function BodyEditor({ body, onChange }: BodyEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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

  // ── Clipboard read via extension host ──────────────────────────────
  // The webview iframe can't reliably read the system clipboard, so we
  // ask the extension host (which has vscode.env.clipboard) instead.
  const clipboardResolveRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const unsubscribe = vscode.onMessage((msg) => {
      if (msg.type === 'clipboardContent' && clipboardResolveRef.current) {
        clipboardResolveRef.current(msg.text);
        clipboardResolveRef.current = null;
      }
    });
    return unsubscribe;
  }, []);

  const readClipboard = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      clipboardResolveRef.current = resolve;
      vscode.postMessage({ type: 'readClipboard' });
      setTimeout(() => {
        if (clipboardResolveRef.current === resolve) {
          clipboardResolveRef.current = null;
          resolve('');
        }
      }, 2000);
    });
  }, []);

  // ── Clipboard write (works in webviews — only reads are broken) ────
  const writeClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => { /* denied */ });
  }, []);

  // ── Context-menu actions ───────────────────────────────────────────
  const handleCut = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = ed.getSelection();
    if (sel && !sel.isEmpty()) {
      const text = ed.getModel()?.getValueInRange(sel) ?? '';
      writeClipboard(text);
      ed.executeEdits('cut', [{ range: sel, text: '' }]);
    }
    setContextMenu(null);
  }, [writeClipboard]);

  const handleCopy = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = ed.getSelection();
    if (sel && !sel.isEmpty()) {
      const text = ed.getModel()?.getValueInRange(sel) ?? '';
      writeClipboard(text);
    }
    setContextMenu(null);
  }, [writeClipboard]);

  const handlePaste = useCallback(async () => {
    const ed = editorRef.current;
    if (!ed) return;
    const text = await readClipboard();
    if (text) {
      ed.trigger('clipboard', 'type', { text });
    }
    setContextMenu(null);
  }, [readClipboard]);

  const handleSelectAll = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (model) {
      ed.setSelection(model.getFullModelRange());
    }
    setContextMenu(null);
  }, []);

  const formatJson = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (!model) return;
    try {
      const formatted = JSON.stringify(JSON.parse(model.getValue()), null, 2);
      const fullRange = model.getFullModelRange();
      ed.executeEdits('format', [{ range: fullRange, text: formatted }]);
    } catch {
      // Invalid JSON — nothing to format
    }
    setContextMenu(null);
  }, []);

  // ── Dismiss context menu on click / scroll / keypress ──────────────
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    document.addEventListener('click', dismiss);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('click', dismiss);
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('scroll', dismiss, true);
    };
  }, [contextMenu]);

  // ── Editor mount ───────────────────────────────────────────────────
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // VS Code webviews intercept Ctrl+C/X/V before Monaco sees them.
    // Override all clipboard keybindings to use extension-host clipboard.
    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, async () => {
      const text = await readClipboard();
      if (text) {
        editor.trigger('clipboard', 'type', { text });
      }
    });
    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      const sel = editor.getSelection();
      if (sel && !sel.isEmpty()) {
        const text = editor.getModel()?.getValueInRange(sel) ?? '';
        writeClipboard(text);
      }
    });
    // eslint-disable-next-line no-bitwise
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
      const sel = editor.getSelection();
      if (sel && !sel.isEmpty()) {
        const text = editor.getModel()?.getValueInRange(sel) ?? '';
        writeClipboard(text);
        editor.executeEdits('cut', [{ range: sel, text: '' }]);
      }
    });

    // Open our custom context menu instead of Monaco's broken one.
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sel = editor.getSelection();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          hasSelection: !!sel && !sel.isEmpty(),
        });
      });
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
            onClick={() => formatJson()}
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
              contextmenu: false,
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

      {contextMenu && (
        <div
          className="editor-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            disabled={!contextMenu.hasSelection}
            onClick={handleCut}
          >
            Cut
          </button>
          <button
            type="button"
            disabled={!contextMenu.hasSelection}
            onClick={handleCopy}
          >
            Copy
          </button>
          <button type="button" onClick={handlePaste}>
            Paste
          </button>
          <div className="editor-context-menu-separator" />
          <button type="button" onClick={handleSelectAll}>
            Select All
          </button>
          {body.type === 'json' && (
            <>
              <div className="editor-context-menu-separator" />
              <button type="button" onClick={formatJson}>
                Format Document
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
