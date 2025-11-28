export interface JsonNode {
  [key: string]: any;
}

export interface FileStats {
  originalSize: number;
  currentSize: number;
  nodeCount: number;
  lastModified: number;
}

export type PathSegment = string;

export interface SearchResult {
  path: string;
  value: any;
  isKeyMatch: boolean;
}

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