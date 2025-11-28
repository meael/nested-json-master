import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Save, FileJson, Info, Trash2, RefreshCw } from 'lucide-react';
import JsonListView from './components/JsonListView';
import EditorPanel from './components/EditorPanel';
import { parsePathKey, addNestedValue, flattenJson, calculateDiff, getJsonStats } from './utils/jsonLogic';
import { FileStats, FileSystemFileHandle, DiffStats, FlatEntry } from './types';

const App: React.FC = () => {
  const [originalData, setOriginalData] = useState<any | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [flatItems, setFlatItems] = useState<FlatEntry[]>([]);
  
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [diffStats, setDiffStats] = useState<DiffStats>({ added: 0, removed: 0, modified: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-calculate flat list and stats whenever data changes
  useEffect(() => {
    if (data) {
      setFlatItems(flattenJson(data));
      if (originalData) {
        setDiffStats(calculateDiff(originalData, data));
      }
    } else {
      setFlatItems([]);
      setDiffStats({ added: 0, removed: 0, modified: 0 });
    }
  }, [data, originalData]);

  // --- File Handling ---

  const handleFileLoad = async (content: string, name: string, handle: FileSystemFileHandle | null) => {
    try {
      const parsed = JSON.parse(content);
      setOriginalData(JSON.parse(JSON.stringify(parsed))); // Deep copy for comparison
      setData(parsed);
      setFileName(name);
      setFileHandle(handle);
      setError(null);
      setSuccessMsg("File loaded successfully.");
    } catch (e) {
      setError("Invalid JSON file. Please check the syntax.");
    }
  };

  const openFile = async () => {
    try {
        // Fix: Check for cross-origin iframe environment which blocks File System Access API
        if (window.self !== window.top) {
            throw new Error("Iframe context");
        }
        
        if ('showOpenFilePicker' in window) {
            const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
            });
            const file = await handle.getFile();
            const content = await file.text();
            handleFileLoad(content, file.name, handle);
        } else {
            throw new Error("API not supported");
        }
    } catch (err) {
      // Fallback for iframes or unsupported browsers
      console.warn("File System API unavailable or blocked, falling back to input", err);
      fileInputRef.current?.click();
    }
  };

  const handleLegacyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    handleFileLoad(content, file.name, null);
    // Reset value to allow re-uploading same file
    e.target.value = '';
  };

  const saveFile = async () => {
    if (!data) return;

    try {
      const content = JSON.stringify(data, null, 2);
      
      // --- Safety Check: Size Validation ---
      const stats = getJsonStats(content);
      const originalStats = originalData ? getJsonStats(JSON.stringify(originalData)) : stats;

      if (stats.size < originalStats.size * 0.5) {
        if (!confirm("Warning: The file size has decreased significantly (over 50%). Are you sure you haven't accidentally deleted data?")) {
            return;
        }
      }

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        setSuccessMsg("Saved directly to file system!");
        // Update original data to current state after save
        setOriginalData(JSON.parse(JSON.stringify(data)));
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
        setOriginalData(JSON.parse(JSON.stringify(data)));
      }

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
          // Keep as string
        }
      } else if (valueStr === 'true') finalValue = true;
      else if (valueStr === 'false') finalValue = false;
      else if (!isNaN(Number(valueStr)) && valueStr.trim() !== '') finalValue = Number(valueStr);

      const newData = addNestedValue(data, pathSegments, finalValue);
      setData(newData);
      setSuccessMsg(`Added: ${pathSegments.join(' -> ')}`);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setSuccessMsg(null);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // --- Drag & Drop ---
  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file') {
          try {
            // Check for modern API support first
            if ('getAsFileSystemHandle' in item) {
                const handle = await (item as any).getAsFileSystemHandle();
                if (handle.kind === 'file') {
                    const file = await handle.getFile();
                    const text = await file.text();
                    handleFileLoad(text, file.name, handle);
                    return;
                }
            }
          } catch(e) {
             console.warn("Native FS handle access failed", e);
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
        className="min-h-screen flex flex-col font-sans text-slate-800 bg-gray-50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
    >
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-indigo-200 shadow-md">
              <FileJson size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
                Nested JSON Master
                </h1>
                {fileName && <p className="text-xs text-gray-400 font-medium">{fileName}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Diff Stats Pill */}
            {data && (
                <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-1.5 border border-gray-200 gap-4 text-xs font-semibold mr-4">
                    <span className="text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        +{diffStats.added} Added
                    </span>
                    <span className="text-amber-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        ~{diffStats.modified} Modified
                    </span>
                    <span className="text-red-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        -{diffStats.removed} Removed
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-sm transition"
            >
              <UploadCloud size={18} />
              Open
            </button>
            <button 
              onClick={saveFile}
              disabled={!data}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!data ? (
          <div className="h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 text-indigo-400">
            <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                <UploadCloud size={48} className="text-indigo-500" />
            </div>
            <p className="text-xl font-semibold text-slate-700">Drag & drop a JSON file here</p>
            <p className="text-sm mt-2 text-slate-500">or click "Open" to start editing</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
             
             <EditorPanel 
                 onAddKey={handleAddKey} 
                 onSearch={handleSearch}
                 lastError={error}
                 lastSuccess={successMsg}
             />

             {/* List Header */}
             <div className="flex items-center justify-between px-2">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Info size={18} className="text-indigo-500"/>
                    Structure Content
                    <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full">
                        {flatItems.length} Keys
                    </span>
                 </h2>
             </div>

             <JsonListView items={flatItems} searchQuery={searchQuery} />

          </div>
        )}
      </main>
    </div>
  );
};

export default App;