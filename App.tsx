import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Save, FileJson, AlertTriangle, Info } from 'lucide-react';
import JsonTreeView from './components/JsonTreeView';
import EditorPanel from './components/EditorPanel';
import { parsePathKey, addNestedValue, getJsonStats } from './utils/jsonLogic';
import { FileStats, FileSystemFileHandle } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [highlightPath, setHighlightPath] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File Handling ---

  const handleFileLoad = async (content: string, name: string, handle: FileSystemFileHandle | null) => {
    try {
      const parsed = JSON.parse(content);
      setData(parsed);
      setFileName(name);
      setFileHandle(handle);
      
      const stats = getJsonStats(content);
      setFileStats({
        originalSize: stats.size,
        currentSize: stats.size,
        nodeCount: stats.count,
        lastModified: Date.now()
      });
      setError(null);
      setSuccessMsg("File loaded successfully.");
    } catch (e) {
      setError("Invalid JSON file. Please check the syntax.");
    }
  };

  const openFile = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        });
        const file = await handle.getFile();
        const content = await file.text();
        handleFileLoad(content, file.name, handle);
      } catch (err) {
        // User cancelled or error
        console.error(err);
      }
    } else {
      // Fallback
      fileInputRef.current?.click();
    }
  };

  const handleLegacyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    handleFileLoad(content, file.name, null);
  };

  const saveFile = async () => {
    if (!data) return;

    try {
      const content = JSON.stringify(data, null, 2);
      const stats = getJsonStats(content);

      // --- Safety Check: Size Validation ---
      // We check if size dropped significantly without reason (simple heuristic)
      if (fileStats && stats.size < fileStats.originalSize * 0.5) {
        if (!confirm("Warning: The file size has decreased significantly (over 50%). Are you sure you haven't accidentally deleted data?")) {
            return;
        }
      }

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setSuccessMsg("Saved directly to file system!");
      } else {
        // Legacy download
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'edited_data.json';
        a.click();
        URL.revokeObjectURL(url);
        setSuccessMsg("File downloaded.");
      }

      // Update stats
      setFileStats(prev => prev ? ({
          ...prev,
          currentSize: stats.size,
          lastModified: Date.now()
      }) : null);

    } catch (e) {
      setError("Failed to save file.");
    }
  };

  // --- Logic Integration ---

  const handleAddKey = (pathStr: string, valueStr: string) => {
    if (!data) {
      setError("Please load a JSON file first.");
      return;
    }

    try {
      const pathSegments = parsePathKey(pathStr);
      
      // Auto-detect value type
      let finalValue: any = valueStr;
      if (valueStr.startsWith('{') || valueStr.startsWith('[')) {
        try {
          finalValue = JSON.parse(valueStr);
        } catch {
          // Keep as string if parsing fails, or we could throw error if strict JSON required
        }
      } else if (valueStr === 'true') finalValue = true;
      else if (valueStr === 'false') finalValue = false;
      else if (!isNaN(Number(valueStr)) && valueStr.trim() !== '') finalValue = Number(valueStr);

      const newData = addNestedValue(data, pathSegments, finalValue);
      setData(newData);
      setSuccessMsg(`Successfully added key: ${pathSegments.join(' -> ')}`);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setSuccessMsg(null);
    }
  };

  const handleSearch = (query: string) => {
    setHighlightPath(query);
  };

  // --- Drag & Drop ---
  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file') {
          // If browser supports getAsFileSystemHandle (modern Chrome/Edge)
          if ('getAsFileSystemHandle' in item) {
             const handle = await (item as any).getAsFileSystemHandle();
             if (handle.kind === 'file') {
                 const file = await handle.getFile();
                 const text = await file.text();
                 handleFileLoad(text, file.name, handle);
                 return;
             }
          }
          // Fallback
          const file = item.getAsFile();
          if(file) {
              const text = await file.text();
              handleFileLoad(text, file.name, null);
          }
      }
  };

  return (
    <div 
        className="min-h-screen flex flex-col font-sans text-slate-800"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
    >
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <FileJson size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Nested JSON Master
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             {fileStats && (
                <div className="hidden md:flex flex-col items-end mr-4 text-xs text-gray-500">
                    <span>Size: {(fileStats.currentSize / 1024).toFixed(2)} KB</span>
                    <span className={fileStats.currentSize !== fileStats.originalSize ? "text-amber-600 font-semibold" : ""}>
                        Diff: {fileStats.currentSize - fileStats.originalSize > 0 ? '+' : ''}
                        {fileStats.currentSize - fileStats.originalSize} B
                    </span>
                </div>
             )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLegacyUpload} 
              className="hidden" 
              accept=".json"
            />
            <button 
              onClick={openFile}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <UploadCloud size={18} />
              Open JSON
            </button>
            <button 
              onClick={saveFile}
              disabled={!data}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!data ? (
          <div className="h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-gray-400">
            <UploadCloud size={64} className="mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Drag & drop a JSON file here</p>
            <p className="text-sm mt-2">or click "Open JSON" to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            
            {/* Left: JSON Viewer */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
               <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <Info size={14}/> {fileName}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-600">Read/Write</span>
               </div>
               <div className="flex-1 overflow-auto p-4">
                  <JsonTreeView data={data} name="root" isRoot={true} highlightPath={highlightPath} />
               </div>
            </div>

            {/* Right: Tools */}
            <div className="lg:col-span-1 h-full">
               <EditorPanel 
                 onAddKey={handleAddKey} 
                 onSearch={handleSearch}
                 lastError={error}
                 lastSuccess={successMsg}
               />
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
};

export default App;