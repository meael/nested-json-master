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
  // Split by first colon, then by arrows
  // Regex looks complex but essentially: split by : or ->
  return pathString
    .split(/(?:->|:)/)
    .map(segment => segment.trim())
    .filter(Boolean);
};