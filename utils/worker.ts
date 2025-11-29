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
            data: parseToMap(payload.content),
            name: payload.name,
            handle: payload.handle
          };
          break;
        case 'STRINGIFY':
          result = stringifyMap(payload);
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
      if (node instanceof Map) {
        if (node.size === 0) {
          result.push({
            id: currentKeys.join('|'),
            path: formatPath(currentKeys),
            keys: currentKeys,
            value: {}
          });
        } else {
          for (const [key, value] of node) {
            traverse(value, [...currentKeys, key]);
          }
        }
      } else if (node && typeof node === 'object' && !Array.isArray(node)) {
        // Fallback for plain objects
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

  function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Map) {
      const cloned = new Map();
      for (const [key, value] of obj) {
        cloned.set(key, deepClone(value));
      }
      return cloned;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }

  function addNestedValue(data, pathSegments, value, allowOverwrite) {
    if (pathSegments.length === 0) return data;
    const newData = deepClone(data);
    let current = newData;
    
    for (let i = 0; i < pathSegments.length; i++) {
      const key = pathSegments[i];
      const isLast = i === pathSegments.length - 1;

      if (isLast) {
        if (current instanceof Map) {
           if (!allowOverwrite && current.has(key)) {
             throw new Error('Key already exists: ' + formatPath(pathSegments));
           }
           current.set(key, value);
        } else {
           // Fallback for plain objects
           if (!allowOverwrite && Object.prototype.hasOwnProperty.call(current, key)) {
             throw new Error('Key already exists: ' + formatPath(pathSegments));
           }
           current[key] = value;
        }
      } else {
        if (current instanceof Map) {
           if (!current.has(key)) {
             current.set(key, new Map());
           } else {
             const val = current.get(key);
             if (typeof val !== 'object' || val === null) {
                throw new Error("Path conflict at '" + key + "': cannot add nested key because it is a value, not an object.");
             }
           }
           current = current.get(key);
        } else {
           // Fallback
           if (!Object.prototype.hasOwnProperty.call(current, key)) {
             current[key] = new Map(); // Create Map for new nested objects
           } else if (typeof current[key] !== 'object' || current[key] === null) {
             throw new Error("Path conflict at '" + key + "': cannot add nested key because it is a value, not an object.");
           }
           current = current[key];
        }
      }
    }
    return newData;
  }

  function parseToMap(text) {
    let at = 0;
    const ch = () => text.charAt(at);
    const next = () => at++;
    const skipWhite = () => { while (at < text.length && /\\s/.test(ch())) next(); };
    
    const parseValue = () => {
      skipWhite();
      const c = ch();
      if (c === '{') return parseObject();
      if (c === '[') return parseArray();
      if (c === '"') return parseString();
      if (c === 't') { at += 4; return true; }
      if (c === 'f') { at += 5; return false; }
      if (c === 'n') { at += 4; return null; }
      return parseNumber();
    };

    const parseObject = () => {
      const map = new Map();
      next(); // '{'
      skipWhite();
      if (ch() === '}') { next(); return map; }
      while (true) {
        skipWhite();
        const key = parseString();
        skipWhite();
        if (ch() !== ':') throw new Error('Expected : at ' + at);
        next();
        const val = parseValue();
        map.set(key, val);
        skipWhite();
        if (ch() === '}') { next(); return map; }
        if (ch() !== ',') throw new Error('Expected , at ' + at);
        next();
      }
    };

    const parseArray = () => {
      const arr = [];
      next(); // '['
      skipWhite();
      if (ch() === ']') { next(); return arr; }
      while (true) {
        arr.push(parseValue());
        skipWhite();
        if (ch() === ']') { next(); return arr; }
        if (ch() !== ',') throw new Error('Expected , at ' + at);
        next();
      }
    };

    const parseString = () => {
      const start = at;
      next(); // '"'
      while (at < text.length) {
        if (ch() === '\\\\') {
           at += 2; 
        } else if (ch() === '"') {
           break;
        } else {
           next();
        }
      }
      next(); 
      return JSON.parse(text.substring(start, at));
    };

    const parseNumber = () => {
      const start = at;
      if (ch() === '-') next();
      while (at < text.length && /[0-9.eE+-]/.test(ch())) next();
      const numStr = text.substring(start, at);
      const num = Number(numStr);
      if (isNaN(num)) throw new Error("Invalid number: " + numStr);
      return num;
    };
    
    return parseValue();
  }

  function stringifyMap(data, space = 2) {
    const indentStr = typeof space === 'number' ? ' '.repeat(space) : (space || '');
    
    function stringify(node, depth) {
      const indent = indentStr.repeat(depth);
      const nextIndent = indentStr.repeat(depth + 1);
      
      if (node instanceof Map) {
        if (node.size === 0) return '{}';
        const entries = [];
        for (const [key, value] of node) {
          entries.push(nextIndent + JSON.stringify(key) + ': ' + stringify(value, depth + 1));
        }
        return '{\\n' + entries.join(',\\n') + '\\n' + indent + '}';
      }
      
      if (Array.isArray(node)) {
        if (node.length === 0) return '[]';
        const items = node.map(item => stringify(item, depth + 1));
        return '[\\n' + items.map(i => nextIndent + i).join(',\\n') + '\\n' + indent + ']';
      }
      
      if (typeof node === 'object' && node !== null) {
         return JSON.stringify(node);
      }
      
      return JSON.stringify(node);
    }
    
    return stringify(data, 0);
  }
`;

export const createWorker = () => {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};