/**
 * Headers editor component
 */

import { KeyValueEditor, type KeyValueItem } from '../common/KeyValueEditor';
import type { HttpHeader } from '../../vscode';

interface HeadersEditorProps {
  headers: HttpHeader[];
  onChange: (headers: HttpHeader[]) => void;
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  const handleChange = (items: KeyValueItem[]) => {
    onChange(items as HttpHeader[]);
  };

  return (
    <div className="headers-editor">
      <KeyValueEditor
        items={headers}
        onChange={handleChange}
        keyPlaceholder="Header name"
        valuePlaceholder="Header value"
      />
    </div>
  );
}
