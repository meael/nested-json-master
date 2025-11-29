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
 * Returns null if the string doesn't look like a path
 */
export const detectPathFormat = (pathString: string): PathFormat | null => {
  if (!pathString || pathString.trim() === '') return null;
  
  const trimmed = pathString.trim();
  
  // JSONPath: starts with $
  if (trimmed.startsWith('$')) return 'jsonpath';
  
  // Colon-Arrow: contains : followed by ->
  if (trimmed.includes(':') && trimmed.includes('->')) return 'colon';
  
  // Bracket: contains [" or [number]
  if (/\["/.test(trimmed) || /\[\d+\]/.test(trimmed)) return 'bracket';
  
  // Arrow only: contains -> but no :
  if (trimmed.includes('->') && !trimmed.includes(':')) return 'arrow';
  
  // Dot notation: contains . AND looks like a path (alphanumeric segments)
  // Avoid matching URLs, emails, or random text with dots
  const withoutBrackets = trimmed.replace(/\[.*?\]/g, '');
  if (withoutBrackets.includes('.')) {
    // Check if it looks like a path: segments separated by dots, mostly alphanumeric/underscore
    // Reject if it has spaces, @, /, http, etc (common in non-path text)
    if (/\s|@|\/\/|http|www/.test(trimmed)) {
      return null; // Likely not a path
    }
    
    // Check if segments look like keys (start with letter or underscore)
    const segments = withoutBrackets.split('.');
    const looksLikePath = segments.every(seg => 
      seg.length > 0 && /^[a-zA-Z_]/.test(seg)
    );
    
    if (looksLikePath) {
      // Lodash: only contains dots and alphanumeric (no special chars)
      if (/^[a-zA-Z0-9_.]+$/.test(trimmed)) return 'lodash';
      return 'dot';
    }
  }
  
  // Doesn't look like a path
  return null;
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
