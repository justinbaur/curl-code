/**
 * Reusable key-value pair editor component
 */


export interface KeyValueItem {
  key: string;
  value: string;
  enabled: boolean;
}

interface KeyValueEditorProps {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const handleItemChange = (
    index: number,
    field: keyof KeyValueItem,
    value: string | boolean
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleAdd = () => {
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  return (
    <div className="kv-editor">
      {items.map((item, index) => (
        <div key={index} className="kv-row">
          <input
            type="checkbox"
            className="kv-checkbox"
            checked={item.enabled}
            onChange={(e) => handleItemChange(index, 'enabled', e.target.checked)}
          />
          <input
            type="text"
            className="kv-key"
            placeholder={keyPlaceholder}
            value={item.key}
            onChange={(e) => handleItemChange(index, 'key', e.target.value)}
          />
          <input
            type="text"
            className="kv-value"
            placeholder={valuePlaceholder}
            value={item.value}
            onChange={(e) => handleItemChange(index, 'value', e.target.value)}
          />
          <button
            type="button"
            className="btn-icon kv-delete"
            onClick={() => handleDelete(index)}
            title="Delete"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn-icon kv-add" onClick={handleAdd}>
        + Add
      </button>
    </div>
  );
}
