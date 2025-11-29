export type PathFormat = 'colon' | 'bracket' | 'dot' | 'arrow' | 'jsonpath' | 'lodash';

export const PATH_FORMAT_LABELS: Record<PathFormat, string> = {
  colon: 'Colon-Arrow: root:key->sub',
  bracket: 'Bracket: root["key"]',
  dot: 'Dot: root.key',
  arrow: 'Arrow: root->key',
  jsonpath: 'JSONPath: $.key',
  lodash: 'Lodash: key'
};

/**
 * Escapes a key for use in bracket notation
 */
const escapeBracket = (key: string): string => {
  return `["${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
};

/**
 * Checks if a key needs escaping in dot notation
 */
const needsEscaping = (key: string): boolean => {
  // Check if key contains special characters or starts with a number
  return /[.\s\-\[\]]/.test(key) || /^\d/.test(key);
};

/**
 * Detects the path format from a path string
 */
export const detectPathFormat = (pathString: string): PathFormat => {
  if (!pathString || pathString.trim() === '') return 'colon';
  
  const trimmed = pathString.trim();
  
  // JSONPath: starts with $
  if (trimmed.startsWith('$')) return 'jsonpath';
  
  // Colon-Arrow: contains : followed by ->
  if (trimmed.includes(':') && trimmed.includes('->')) return 'colon';
  
  // Bracket: contains [" or [number]
  if (/\["/.test(trimmed) || /\[\d+\]/.test(trimmed)) return 'bracket';
  
  // Arrow only: contains -> but no :
  if (trimmed.includes('->') && !trimmed.includes(':')) return 'arrow';
  
  // Dot notation: contains . but not in brackets
  // Check if it has dots outside of brackets
  const withoutBrackets = trimmed.replace(/\[.*?\]/g, '');
  if (withoutBrackets.includes('.')) return 'dot';
  
  // Lodash: only contains dots and alphanumeric (no special chars)
  if (/^[a-zA-Z0-9_.]+$/.test(trimmed) && trimmed.includes('.')) return 'lodash';
  
  // Default to colon format
  return 'colon';
};

/**
 * Formats a path according to the specified format
 */
export const formatPathAs = (keys: string[], format: PathFormat): string => {
  if (keys.length === 0) return '';

  switch (format) {
    case 'colon':
      // root:key1->key2->key3
      if (keys.length === 1) return keys[0];
      return `${keys[0]}:${keys.slice(1).join('->')}`;

    case 'bracket':
      // root["key1"]["key2"][0]
      return keys.map(key => {
        if (/^\d+$/.test(key)) {
          return `[${key}]`;
        }
        return escapeBracket(key);
      }).join('');

    case 'dot':
      // root.key1.key2[0]
      return keys.map((key, index) => {
        if (/^\d+$/.test(key)) {
          return `[${key}]`;
        }
        if (needsEscaping(key)) {
          return (index === 0 ? '' : '.') + escapeBracket(key);
        }
        return (index === 0 ? '' : '.') + key;
      }).join('');

    case 'arrow':
      // root->key1->key2[0]
      return keys.map((key, index) => {
        if (/^\d+$/.test(key)) {
          return `[${key}]`;
        }
        return (index === 0 ? '' : '->') + key;
      }).join('');

    case 'jsonpath':
      // $.key1.key2[0]
      return '$' + keys.map(key => {
        if (/^\d+$/.test(key)) {
          return `[${key}]`;
        }
        if (needsEscaping(key)) {
          return escapeBracket(key);
        }
        return '.' + key;
      }).join('');

    case 'lodash':
      // key1.key2.0
      return keys.map(key => key).join('.');

    default:
      return keys.join('.');
  }
};
