import { FlatEntry, DiffStats, JsonNode } from '../types';

// We export the worker code as a string to create a Blob URL, 
// avoiding need for separate file serving configuration.
const workerCode = `
  self.onmessage = function(e) {
    const { type, payload, id } = e.data;
    
    try {
      let result;
      switch (type) {
        case 'FLATTEN':
          result = flattenJson(payload);
          break;
        case 'DIFF':
          result = calculateDiff(payload.original, payload.current);
          break;
        case 'PARSE':
          result = {
            data: JSON.parse(payload.content),
            name: payload.name,
            handle: payload.handle
          };
          break;
        case 'ADD_VALUE':
          // We return the payload metadata back so the main thread knows what was added
          const newData = addNestedValue(payload.data, payload.path, payload.value, payload.allowOverwrite);
          result = { 
            data: newData, 
            addedPath: payload.path, 
            addedValue: payload.value 
          };
          break;
        default:
          throw new Error('Unknown worker action');
      }
      self.postMessage({ type: 'SUCCESS', id, result });
    } catch (error) {
      self.postMessage({ type: 'ERROR', id, error: error.message });
    }
  };

  function flattenJson(data) {
    const result = [];
    const traverse = (node, currentKeys) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        const keys = Object.keys(node);
        if (keys.length === 0) {
          result.push({
            id: currentKeys.join('|'),
            path: formatPath(currentKeys),
            keys: currentKeys,
            value: {}
          });
        } else {
          keys.forEach(key => {
            traverse(node[key], [...currentKeys, key]);
          });
        }
      } else {
        result.push({
          id: currentKeys.join('|'),
          path: formatPath(currentKeys),
          keys: currentKeys,
          value: node
        });
      }
    };
    if (data) traverse(data, []);
    return result;
  }

  function formatPath(keys) {
    if (!keys || keys.length === 0) return '';
    if (keys.length === 1) return keys[0];
    return keys[0] + ':' + keys.slice(1).join('->');
  }

  function calculateDiff(original, current) {
    const flatOrg = flattenJson(original);
    const flatCurr = flattenJson(current);
    const orgMap = new Map(flatOrg.map(i => [i.path, JSON.stringify(i.value)]));
    const currMap = new Map(flatCurr.map(i => [i.path, JSON.stringify(i.value)]));

    let added = 0;
    let modified = 0;
    let removed = 0;

    currMap.forEach((val, key) => {
      if (!orgMap.has(key)) {
        added++;
      } else if (orgMap.get(key) !== val) {
        modified++;
      }
    });

    orgMap.forEach((_, key) => {
      if (!currMap.has(key)) {
        removed++;
      }
    });

    return { added, modified, removed };
  }

  function addNestedValue(data, pathSegments, value, allowOverwrite) {
    if (pathSegments.length === 0) return data;
    const newData = JSON.parse(JSON.stringify(data));
    let current = newData;
    
    for (let i = 0; i < pathSegments.length; i++) {
      const key = pathSegments[i];
      const isLast = i === pathSegments.length - 1;

      if (isLast) {
        // If overwrite is NOT allowed, check existence
        if (!allowOverwrite && Object.prototype.hasOwnProperty.call(current, key)) {
          throw new Error('Key already exists: ' + formatPath(pathSegments));
        }
        current[key] = value;
      } else {
        if (!Object.prototype.hasOwnProperty.call(current, key)) {
          current[key] = {};
        } else if (typeof current[key] !== 'object' || current[key] === null) {
          throw new Error("Path conflict at '" + key + "': cannot add nested key because it is a value, not an object.");
        }
        current = current[key];
      }
    }
    return newData;
  }
`;

export const createWorker = () => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};