
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, Save, FileJson, Info, RefreshCw, FileText, AlertOctagon, RotateCcw, Copy, Pencil, X, CheckCircle2, Lock, LockOpen, Download } from 'lucide-react';
import JsonListView from './components/JsonListView';
import EditorPanel from './components/EditorPanel';
import AddKeyModal from './components/AddKeyModal';
import Toast from './components/Toast';
import { getJsonStats } from './utils/jsonLogic';
import { FileSystemFileHandle, DiffStats, FlatEntry } from './types';
import { DEMO_DATA } from './demoData';
import { createWorker } from './utils/worker';
import { parsePath, formatPath } from './utils/pathFormat';

const App: React.FC = () => {
  const [originalData, setOriginalData] = useState<any | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [flatItems, setFlatItems] = useState<FlatEntry[]>([]);
  
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [diffStats, setDiffStats] = useState<DiffStats>({ added: 0, removed: 0, modified: 0 });
  const [unsavedPaths, setUnsavedPaths] = useState<Set<string>>(new Set());
  
  // Post-Save state
  const [isSavedState, setIsSavedState] = useState(false);
  const [savedItemsSnapshot, setSavedItemsSnapshot] = useState<FlatEntry[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ path: string, value: any } | null>(null);
  const [addKeyError, setAddKeyError] = useState<string | null>(null);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Init Worker
  useEffect(() => {
    workerRef.current = createWorker();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const postWorkerMessage = useCallback((type: string, payload: any, id: string) => {
    setIsProcessing(true);
    workerRef.current?.postMessage({ type, payload, id });
  }, []);

  // Update Derived State via Worker
  useEffect(() => {
    if (data) {
      postWorkerMessage('FLATTEN', data, 'flatten');
      if (originalData) {
        postWorkerMessage('DIFF', { original: originalData, current: data }, 'diff');
      }
    } else {
      setFlatItems([]);
      setDiffStats({ added: 0, removed: 0, modified: 0 });
    }
  }, [data, originalData, postWorkerMessage]);

  const handleParsedData = (parsed: any, name: string, handle: any) => {
    setOriginalData(structuredClone(parsed));
    setData(parsed);
    setFileName(name);
    setFileHandle(handle);
    setUnsavedPaths(new Set());
    setIsSavedState(false);
    setSavedItemsSnapshot([]);
    setToast({ message: 'File loaded successfully', type: 'success' });
  };

  const handleFileLoad = async (content: string, name: string, handle: FileSystemFileHandle | null) => {
    try {
        postWorkerMessage('PARSE', { content, name, handle }, 'parse');
    } catch (e) {
      setToast({ message: 'Invalid JSON file', type: 'error' });
    }
  };

  const loadDemoData = () => {
    try {
        const content = JSON.stringify(DEMO_DATA);
        postWorkerMessage('PARSE', { content, name: "demo_localization.json", handle: null }, 'parse');
    } catch (e) {
        setToast({ message: 'Failed to load demo data', type: 'error' });
    }
  };

  const openFile = async () => {
    try {
        if (window.self !== window.top) throw new Error("Iframe context");
        
        if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await (window as any).showOpenFilePicker({
                    types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
                });
                const file = await handle.getFile();
                const content = await file.text();
                handleFileLoad(content, file.name, handle);
            } catch (pickerErr: any) {
                // If user cancelled, do nothing
                if (pickerErr.name === 'AbortError') return;
                throw pickerErr; // Re-throw other errors to fall back
            }
        } else {
            throw new Error("API not supported");
        }
    } catch (err) {
      // Fallback to legacy input
      console.warn("Falling back to legacy file input", err);
      setToast({ 
          message: 'Direct editing not supported. Opening in Read-Only mode.', 
          type: 'error' 
      });
      fileInputRef.current?.click();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const item = e.dataTransfer.items[0];
      if (!item) return;

      try {
          // Try modern API first
          if ('getAsFileSystemHandle' in item) {
              const handle = await (item as any).getAsFileSystemHandle();
              if (handle && handle.kind === 'file') {
                  const file = await handle.getFile();
                  const content = await file.text();
                  handleFileLoad(content, file.name, handle);
                  return;
              }
          }
      } catch (err) {
          console.warn("FileSystemAccess API failed for drop, falling back", err);
      }

      // Fallback to standard file drop
      const file = e.dataTransfer.files[0];
      if (file) {
          const content = await file.text();
          handleFileLoad(content, file.name, null);
          setToast({ 
              message: 'Opened in Read-Only mode (Drag & Drop)', 
              type: 'error' 
          });
      }
  };

  const handleLegacyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    handleFileLoad(content, file.name, null);
    e.target.value = '';
  };

  const saveFile = () => {
    if (!data) return;
    postWorkerMessage('STRINGIFY', data, 'stringify');
  };

  const handleStringifiedData = async (content: string) => {
    try {
      // Safety check based on diffs instead of size (since we can't easily stringify originalData map)
      const originalCount = flatItems.length - diffStats.added + diffStats.removed;
      if (originalCount > 0 && diffStats.removed > originalCount * 0.5) {
        if (!confirm("Warning: You have removed more than 50% of the keys. Are you sure?")) {
            return;
        }
      }

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        // Read-Only mode confirmation
        if (!confirm("This file is in Read-Only mode. Download changes as a new file?")) {
            return;
        }

        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'edited_data.json';
        a.click();
        URL.revokeObjectURL(url);
      }

      // Success Logic
      setToast({ message: 'File saved successfully!', type: 'success' });
      setOriginalData(structuredClone(data));
      
      // Transition to Saved State
      const currentPendingItems = flatItems.filter(item => unsavedPaths.has(item.path));
      setSavedItemsSnapshot(currentPendingItems);
      setIsSavedState(true);
      setUnsavedPaths(new Set()); 

    } catch (e) {
      setToast({ message: 'Failed to save file', type: 'error' });
    }
  };

  const handleAddKey = (pathStr: string, valueStr: string, allowOverwrite: boolean) => {
    if (!data) {
      setToast({ message: 'Please load a JSON file first', type: 'error' });
      return;
    }

    try {
      setAddKeyError(null); // Clear previous errors
      // Auto-detect value type
      let finalValue: any = valueStr;
      if (valueStr.startsWith('{') || valueStr.startsWith('[')) {
        try { finalValue = JSON.parse(valueStr); } catch {}
      } else if (valueStr === 'true') finalValue = true;
      else if (valueStr === 'false') finalValue = false;
      else if (!isNaN(Number(valueStr)) && valueStr.trim() !== '') finalValue = Number(valueStr);

      const pathSegments = parsePath(pathStr);
      
      // Dispatch to worker
      postWorkerMessage('ADD_VALUE', { 
          data, 
          path: pathSegments, 
          value: finalValue,
          allowOverwrite: allowOverwrite
      }, 'addValue');

    } catch (err: any) {
      setAddKeyError(err.message);
    }
  };

  const handleResetChanges = () => {
      if(!originalData) return;
      if(confirm("Are you sure you want to discard all pending changes?")) {
          setData(structuredClone(originalData));
          setUnsavedPaths(new Set());
          setIsSavedState(false);
          setSavedItemsSnapshot([]);
          setToast({ message: 'Changes discarded', type: 'success' });
      }
  };

  const handleCopyPendingKeys = (itemsToCopy: FlatEntry[]) => {
      const text = itemsToCopy.map(i => i.path).join('\n');
      navigator.clipboard.writeText(text);
      setToast({ message: 'Keys copied to clipboard', type: 'success' });
  };

  const handleEditPending = (item: FlatEntry) => {
      setEditingItem({ path: item.path, value: item.value });
      setAddKeyError(null);
      setIsModalOpen(true);
  };

  const handleDismissSavedState = () => {
      setIsSavedState(false);
      setSavedItemsSnapshot([]);
  };

  const openAddModal = () => {
      setEditingItem(null);
      setAddKeyError(null);
      setIsModalOpen(true);
  };

  // Determine items to show in the top block
  // If saved state, show snapshot. If normal state, show items derived from unsavedPaths
  const pendingBlockItems = isSavedState 
    ? savedItemsSnapshot 
    : flatItems.filter(item => unsavedPaths.has(item.path));

  const showPendingBlock = pendingBlockItems.length > 0;

  // Update Worker Handler when state changes
  useEffect(() => {
      if (!workerRef.current) return;

      workerRef.current.onmessage = (e) => {
        const { type, result, error, id } = e.data;
        
        setIsProcessing(false);
  
        if (type === 'ERROR') {
          if (id === 'addValue') {
              // Pass error to modal instead of toast
              setAddKeyError(error);
          } else {
              setToast({ message: error, type: 'error' });
          }
          return;
        }
  
        switch (id) {
          case 'flatten':
            setFlatItems(result);
            break;
          case 'diff':
            setDiffStats(result);
            break;
          case 'parse':
            handleParsedData(result.data, result.name, result.handle);
            break;
          case 'addValue':
            // Result contains { data, addedPath, addedValue }
            setData(result.data);
            // Only update unsaved paths if successful
            const newPathStr = formatPath(result.addedPath);
            setUnsavedPaths(prev => {
              const next = new Set(prev);
              next.add(newPathStr);
              return next;
            });
            // Clear any errors and close modal
            setAddKeyError(null);
            setIsModalOpen(false);
            setEditingItem(null);
            // If we were in "Saved" state, modifying data breaks that state
            setIsSavedState(false); 
            break;
          case 'stringify':
            handleStringifiedData(result);
            break;
        }
      };
  }, [handleParsedData, handleStringifiedData]);

  return (
    <div 
        className="min-h-screen flex flex-col font-sans text-slate-800 bg-gray-50"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
    >
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Add/Edit Key Modal */}
      <AddKeyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddKey}
        isProcessing={isProcessing}
        externalError={addKeyError}
        initialPath={editingItem?.path}
        initialValue={editingItem?.value}
        mode={editingItem ? 'edit' : 'add'}
      />

      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="layout-container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-indigo-200 shadow-md">
              <FileJson size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
                Nested JSON Master
                </h1>
                {fileName && (
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 font-medium">{fileName}</p>
                        {fileHandle ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100" title="Changes will be saved directly to the file">
                                <LockOpen size={10} />
                                EDITABLE
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title="Read-Only: Changes will be downloaded as a new file">
                                <Lock size={10} />
                                READ-ONLY
                            </span>
                        )}
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLegacyUpload} 
              className="hidden" 
              accept=".json"
            />
            
            <button 
              onClick={loadDemoData}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition"
            >
              <FileText size={18} />
              Demo
            </button>

            <button 
              onClick={openFile}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-sm transition"
            >
              <UploadCloud size={18} />
              Open
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 layout-container px-4 sm:px-6 py-6">
        {!data ? (
          <div className="h-[60vh] flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 text-indigo-400 mt-8">
            <div className="bg-white p-6 rounded-full shadow-lg mb-6">
                <UploadCloud size={48} className="text-indigo-500" />
            </div>
            <p className="text-xl font-semibold text-slate-700">Drag & drop a JSON file here</p>
            <p className="text-sm mt-2 text-slate-500 mb-6">or open a file to start editing</p>
            
            <button 
              onClick={loadDemoData}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 shadow-md hover:shadow-xl transition transform hover:-translate-y-0.5"
            >
              <FileText size={18} />
              Load Demo Data
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
             
             <EditorPanel 
                 onOpenAddModal={openAddModal}
                 onSearch={(q) => setSearchQuery(q)}
             />

             {/* Pending Changes / Saved Changes Block */}
             {showPendingBlock && (
                <div className={`border rounded-xl shadow-sm overflow-hidden mb-2 animate-fade-in-up ${
                    isSavedState ? 'bg-gray-50 border-gray-300' : 'bg-white border-emerald-200'
                }`}>
                    <div className={`px-4 py-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${
                        isSavedState ? 'bg-gray-100 border-gray-200' : 'bg-emerald-50 border-emerald-100'
                    }`}>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                             <div className="flex items-center gap-2">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ring-1 ${
                                    isSavedState ? 'bg-white text-gray-500 ring-gray-200' : 'bg-white text-emerald-600 ring-emerald-200'
                                }`}>
                                  {isSavedState ? <CheckCircle2 size={18} /> : <AlertOctagon size={18} />}
                                </span>
                                <div>
                                    <h3 className={`text-sm font-bold ${isSavedState ? 'text-gray-700' : 'text-slate-800'}`}>
                                        {isSavedState ? 'Changes Saved' : 'Pending Changes'}
                                    </h3>
                                    <p className="text-xs text-slate-500">{pendingBlockItems.length} items</p>
                                </div>
                             </div>
                             
                             {!isSavedState && (
                                 <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-md border border-emerald-100 shadow-sm text-xs font-semibold">
                                    <span className="text-emerald-600">+{diffStats.added}</span>
                                    <span className="text-amber-600">~{diffStats.modified}</span>
                                    <span className="text-red-500">-{diffStats.removed}</span>
                                 </div>
                             )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button 
                                onClick={() => handleCopyPendingKeys(pendingBlockItems)}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border rounded-lg transition ${
                                    isSavedState 
                                    ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50' 
                                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                }`}
                                title="Copy new keys to clipboard"
                            >
                                <Copy size={16} />
                                <span className="hidden sm:inline">Copy Keys</span>
                            </button>

                            {isSavedState ? (
                                <button
                                    onClick={handleDismissSavedState}
                                    className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition border border-transparent hover:border-gray-300"
                                    title="Close"
                                >
                                    <X size={20} />
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={handleResetChanges}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition"
                                        title="Discard all changes"
                                    >
                                        <RotateCcw size={16} />
                                        <span className="hidden sm:inline">Reset</span>
                                    </button>

                                    <button 
                                        onClick={saveFile}
                                        className={`flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm hover:shadow-md transition active:scale-95 flex-1 sm:flex-none ${
                                            fileHandle 
                                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                                            : 'bg-amber-600 hover:bg-amber-700'
                                        }`}
                                        title={fileHandle ? "Save changes to file" : "Download changes as new file"}
                                    >
                                        {fileHandle ? <Save size={18} /> : <Download size={18} />}
                                        {fileHandle ? "Save" : "Download"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* List of items */}
                    <div className={`p-0 overflow-y-auto border-t max-h-60 ${
                        isSavedState ? 'bg-gray-50 border-gray-200' : 'bg-emerald-50/20 border-emerald-50'
                    }`}>
                        {pendingBlockItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-black/5 transition">
                                <div className="flex-1 min-w-0 mr-4">
                                    <div className="text-xs font-mono font-bold text-slate-700 truncate">{item.path}</div>
                                    <div 
                                        className="text-sm text-slate-600 mt-0.5" 
                                        title={String(item.value)}
                                        style={{ 
                                            wordBreak: 'break-word',
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    >
                                        {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}
                                    </div>
                                </div>
                                {!isSavedState && (
                                    <button 
                                        onClick={() => handleEditPending(item)}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                        title="Edit"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
             )}

             {/* Main List Header */}
             <div className="flex items-center justify-between px-2 pt-2">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Info size={18} className="text-indigo-500"/>
                    Structure Content
                    <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full">
                        {flatItems.length} Keys
                    </span>
                 </h2>
                 {isProcessing && <RefreshCw size={16} className="animate-spin text-indigo-500"/>}
             </div>

             <JsonListView items={flatItems} searchQuery={searchQuery} highlightPaths={unsavedPaths} />

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
