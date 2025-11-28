export interface JsonNode {
  [key: string]: any;
}

export interface FileStats {
  originalSize: number;
  currentSize: number;
  nodeCount: number;
  lastModified: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
}

export interface FlatEntry {
  id: string; // unique identifier for rendering
  path: string;
  keys: string[];
  value: any;
  isNew?: boolean;
}

export type PathSegment = string;

// Browser File System Access API types
export interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write: (data: any) => Promise<void>;
  close: () => Promise<void>;
}