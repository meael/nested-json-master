import { PathSegment } from '../types';

/**
 * formats keys ['a', 'b', 'c'] into "a:b->c"
 */
export const formatPath = (keys: string[]): string => {
  if (!keys || keys.length === 0) return '';
  if (keys.length === 1) return keys[0];
  return `${keys[0]}:${keys.slice(1).join('->')}`;
};

/**
 * Parses "a:b->c" into ['a', 'b', 'c']
 * Trims whitespace to prevent duplicate keys with trailing spaces
 */
export const parsePath = (pathString: string): PathSegment[] => {
  if (!pathString) return [];
  
  const trimmed = pathString.trim();
  
  // JSONPath: $.key1.key2[0]
  if (trimmed.startsWith('$')) {
    return trimmed
      .substring(1) // Remove $
      .split(/\.(?![^\[]*\])|(?=\[)/) // Split by . or [
      .map(s => s.replace(/^\["?|"?\]$/g, '')) // Remove brackets and quotes
      .map(s => s.trim())
      .filter(Boolean);
  }
  
  // Bracket: root["key1"]["key2"][0]
  if (/\["/.test(trimmed) || /\[\d+\]/.test(trimmed)) {
    return trimmed
      .split(/\["?|"?\]/).filter(Boolean)
      .map(s => s.trim())
      .filter(Boolean);
  }
  
  // Colon-Arrow: root:key1->key2
  if (trimmed.includes(':') && trimmed.includes('->')) {
    return trimmed
      .split(/(?:->|:)/)
      .map(segment => segment.trim())
      .filter(Boolean);
  }
  
  // Arrow: root->key1->key2
  if (trimmed.includes('->')) {
    return trimmed
      .split('->')
      .map(s => s.trim())
      .filter(Boolean);
  }
  
  // Dot or Lodash: root.key1.key2 or key1.key2.0
  if (trimmed.includes('.')) {
    // Handle array indices in brackets like key1.key2[0]
    return trimmed
      .split(/\.(?![^\[]*\])|(?=\[)/)
      .map(s => s.replace(/^\[|\]$/g, ''))
      .map(s => s.trim())
      .filter(Boolean);
  }
  
  // Single key
  return [trimmed];
};