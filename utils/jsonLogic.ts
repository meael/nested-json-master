import { JsonNode, PathSegment, SearchResult } from '../types';

/**
 * Parses a string like "banking:taxPaymentF24->backToSectionName"
 * into ["banking", "taxPaymentF24", "backToSectionName"]
 */
export const parsePathKey = (pathKey: string): PathSegment[] => {
  if (!pathKey) return [];
  // Split by ':' or '->'
  return pathKey.split(/(?:->|:)/).filter(Boolean);
};

/**
 * Checks if a key path already exists in the object
 */
export const checkKeyExists = (data: JsonNode, pathSegments: PathSegment[]): boolean => {
  let current = data;
  for (let i = 0; i < pathSegments.length; i++) {
    const key = pathSegments[i];
    if (current === null || typeof current !== 'object') {
      return false;
    }
    if (!(key in current)) {
      return false;
    }
    current = current[key];
  }
  return true;
};

/**
 * Adds a value at a specific nested path.
 * Mutates a deep copy of the data.
 * Throws error if key exists.
 */
export const addNestedValue = (
  data: JsonNode,
  pathSegments: PathSegment[],
  value: any
): JsonNode => {
  if (pathSegments.length === 0) return data;

  // Deep clone to avoid mutating original state directly during calculation
  const newData = JSON.parse(JSON.stringify(data));
  
  let current = newData;
  
  for (let i = 0; i < pathSegments.length; i++) {
    const key = pathSegments[i];
    const isLast = i === pathSegments.length - 1;

    if (isLast) {
      if (key in current) {
        throw new Error(`Key already exists: ${pathSegments.join(' -> ')}`);
      }
      current[key] = value;
    } else {
      if (!(key in current)) {
        current[key] = {};
      } else if (typeof current[key] !== 'object' || current[key] === null) {
        throw new Error(`Path conflict: '${key}' is not an object, cannot nest under it.`);
      }
      current = current[key];
    }
  }

  return newData;
};

/**
 * Searches the JSON tree for keys matching the parsed path logic or raw values.
 */
export const searchJson = (data: JsonNode, query: string): SearchResult[] => {
  const results: SearchResult[] = [];
  const normalizedQuery = query.toLowerCase();
  
  // Helper for recursion
  const traverse = (node: any, currentPath: string[]) => {
    if (node && typeof node === 'object') {
      Object.keys(node).forEach(key => {
        const newPath = [...currentPath, key];
        const pathString = newPath.join('->');
        
        // Check if the constructed path matches the query logic
        // We simulate the user's input style (e.g., checking if "banking:tax" is in path)
        const pathMatch = pathString.toLowerCase().includes(normalizedQuery.replace(/:/g, '->'));
        
        if (pathMatch) {
            results.push({
                path: pathString,
                value: node[key],
                isKeyMatch: true
            });
        }

        traverse(node[key], newPath);
      });
    } else {
        // Leaf node value check
        if (String(node).toLowerCase().includes(normalizedQuery)) {
             results.push({
                path: currentPath.join('->'),
                value: node,
                isKeyMatch: false
            });
        }
    }
  };

  traverse(data, []);
  return results;
};

/**
 * Calculates simplified stats for validation
 */
export const getJsonStats = (jsonStr: string) => {
    return {
        size: new Blob([jsonStr]).size,
        count: (jsonStr.match(/"/g) || []).length / 2 // Approximation of keys+strings
    }
}