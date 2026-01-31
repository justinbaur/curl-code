/**
 * URL input bar component
 */


interface UrlBarProps {
  value: string;
  onChange: (url: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function UrlBar({ value, onChange, onKeyDown }: UrlBarProps) {
  return (
    <input
      type="text"
      className="url-input"
      placeholder="Enter request URL"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      spellCheck={false}
      autoComplete="off"
    />
  );
}
