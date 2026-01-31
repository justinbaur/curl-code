/**
 * Query parameters editor component
 */

import { KeyValueEditor, type KeyValueItem } from '../common/KeyValueEditor';
import type { QueryParam } from '../../vscode';

interface QueryParamsEditorProps {
  params: QueryParam[];
  onChange: (params: QueryParam[]) => void;
}

export function QueryParamsEditor({ params, onChange }: QueryParamsEditorProps) {
  const handleChange = (items: KeyValueItem[]) => {
    onChange(items as QueryParam[]);
  };

  return (
    <div className="query-params-editor">
      <KeyValueEditor
        items={params}
        onChange={handleChange}
        keyPlaceholder="Parameter name"
        valuePlaceholder="Parameter value"
      />
    </div>
  );
}
