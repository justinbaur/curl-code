/**
 * JSON syntax highlighting utilities
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function highlightJson(json: string): string {
  // SECURITY: Escape the ENTIRE string first so that any non-JSON content
  // (e.g. HTML tags in a malformed response) is neutralised before we inject
  // highlighting <span> elements via dangerouslySetInnerHTML.
  const escaped = escapeHtml(json);
  return escaped.replace(
    /("(?:\\.|[^"\\])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (match.startsWith('"')) {
        if (match.trimEnd().endsWith(':')) {
          const colonIdx = match.lastIndexOf(':');
          return `<span class="json-key">${match.slice(0, colonIdx)}</span><span class="json-punctuation">:</span>`;
        }
        return `<span class="json-string">${match}</span>`;
      }
      if (match === 'true' || match === 'false') {
        return `<span class="json-boolean">${match}</span>`;
      }
      if (match === 'null') {
        return `<span class="json-null">${match}</span>`;
      }
      return `<span class="json-number">${match}</span>`;
    }
  );
}
