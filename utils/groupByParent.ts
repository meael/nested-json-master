import { FlatEntry } from '../types';
import { parsePath } from './pathFormat';
import { PathFormat, formatPathAs } from './pathFormatter';

export interface GroupedItems {
  parentPath: string;
  displayName: string;
  items: FlatEntry[];
}

/**
 * Groups items by their parent path
 * For example:
 * - account:settings->value1
 * - account:settings->value2
 * Both have parent "account:settings", so they get grouped together
 */
export const groupItemsByParent = (items: FlatEntry[], format: PathFormat = 'colon'): GroupedItems[] => {
  const groups = new Map<string, FlatEntry[]>();
  
  items.forEach(item => {
    const segments = parsePath(item.path);
    
    if (segments.length <= 1) {
      // No parent, use empty string as parent
      const existing = groups.get('') || [];
      groups.set('', [...existing, item]);
    } else {
      // Get parent path (all segments except the last one)
      const parentSegments = segments.slice(0, -1);
      const parentPath = formatPathAs(parentSegments, format);
      
      const existing = groups.get(parentPath) || [];
      groups.set(parentPath, [...existing, item]);
    }
  });
  
  // Convert map to array and sort
  const result: GroupedItems[] = [];
  
  groups.forEach((groupItems, parentPath) => {
    result.push({
      parentPath,
      displayName: parentPath || 'Root',
      items: groupItems
    });
  });
  
  // Sort groups by parent path
  result.sort((a, b) => a.parentPath.localeCompare(b.parentPath));
  
  return result;
};

/**
 * Gets the child name (last segment) from a full path
 */
export const getChildName = (path: string): string => {
  const segments = parsePath(path);
  if (segments.length === 0) return path;
  return segments[segments.length - 1];
};

/**
 * Formats a full path according to the specified format
 */
export const formatFullPath = (path: string, format: PathFormat): string => {
  const segments = parsePath(path);
  return formatPathAs(segments, format);
};
