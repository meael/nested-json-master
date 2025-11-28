import { JsonNode, PathSegment, FlatEntry, DiffStats } from '../types';

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
 * Flattens a nested JSON object into a list of entries with paths.
 * Uses "->" as the default separator for display.
 */
export const flattenJson = (data: any): FlatEntry[] => {
  const result: FlatEntry[] = [];
  
  const traverse = (node: any, currentKeys: string[]) => {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      const keys = Object.keys(node);
      if (keys.length === 0) {
        // Empty object
        result.push({
          id: currentKeys.join('|'),
          path: currentKeys.join('->'),
          keys: currentKeys,
          value: {}
        });
      } else {
        keys.forEach(key => {
          traverse(node[key], [...currentKeys, key]);
        });
      }
    } else {
      // Leaf node (primitive or array)
      // Note: We treat arrays as values for this specific use case to avoid exploding arrays into thousands of lines
      // unless specifically requested. For "config" editing, arrays are often treated as atomic values or need special handling.
      // However, to follow the "edit nested JSON" prompt strictly, if it's an array of objects, we might want to recurse.
      // For simplicity and typical use cases (banking codes, translations), we treat the primitive value as the leaf.
      result.push({
        id: currentKeys.join('|'),
        path: currentKeys.join('->'),
        keys: currentKeys,
        value: node
      });
    }
  };

  if (data) {
    traverse(data, []);
  }
  return result;
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

/**
 * Compares two JSON objects and returns diff stats.
 */
export const calculateDiff = (original: any, current: any): DiffStats => {
  const flatOrg = flattenJson(original);
  const flatCurr = flattenJson(current);
  
  const orgMap = new Map(flatOrg.map(i => [i.path, JSON.stringify(i.value)]));
  const currMap = new Map(flatCurr.map(i => [i.path, JSON.stringify(i.value)]));

  let added = 0;
  let modified = 0;
  let removed = 0;

  // Check for added and modified
  currMap.forEach((val, key) => {
    if (!orgMap.has(key)) {
      added++;
    } else if (orgMap.get(key) !== val) {
      modified++;
    }
  });

  // Check for removed
  orgMap.forEach((_, key) => {
    if (!currMap.has(key)) {
      removed++;
    }
  });

  return { added, modified, removed };
};