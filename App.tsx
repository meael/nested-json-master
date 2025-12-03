
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
import { saveFileHandle, getFileHandle } from './utils/storage';
import { PathFormat, detectPathFormat, PATH_FORMAT_LABELS } from './utils/pathFormatter';
import { groupItemsByParent, getChildName, formatFullPath } from './utils/groupByParent';

const App: React.FC = () => {
  const [originalData, setOriginalData] = useState<any | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [flatItems, setFlatItems] = useState<FlatEntry[]>([]);

  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'prompt' | 'denied' | null>(null);

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
  const [pathFormat, setPathFormat] = useState<PathFormat>(() => {
    return (localStorage.getItem('pathFormat') as PathFormat) || 'colon';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Init Worker
  useEffect(() => {
    workerRef.current = createWorker();

    // Try to restore last opened file
    const restoreFile = async () => {
      const handle = await getFileHandle();
      if (handle) {
        // We have a handle, but we need to verify permission or at least try to read it.
        // Often browsers require a gesture for requestPermission, so we might just try to load it.
        // If it fails, we might need to prompt the user.
        try {
          const file = await handle.getFile();
          const content = await file.text();
          handleFileLoad(content, file.name, handle);
          setToast({ message: `Restored ${file.name}`, type: 'success' });
        } catch (err) {
          console.warn("Failed to restore file handle:", err);
          // If we fail (likely permission), we can't easily prompt without a gesture.
          // We could show a "Restore Previous Session" button, but for now let's just fail silently
          // or maybe show a toast "Could not restore last file".
          // Actually, let's just clear it if it's invalid? No, better to keep it.
        }
      }
    };
    restoreFile();

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

    // Check initial permission status if handle exists
    if (handle) {
      saveFileHandle(handle); // Save to IndexedDB
      handle.queryPermission({ mode: 'readwrite' }).then((status: 'granted' | 'prompt' | 'denied') => {
        setPermissionStatus(status);
      });
    } else {
      setPermissionStatus(null);
    }
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

  const verifyPermission = async (handle: FileSystemFileHandle, withWrite = true) => {
    const opts = { mode: withWrite ? 'readwrite' : 'read' } as any;

    // Check if permission was already granted. If so, return true.
    if ((await handle.queryPermission(opts)) === 'granted') {
      setPermissionStatus('granted');
      return true;
    }

    // Request permission. If the user grants permission, return true.
    if ((await handle.requestPermission(opts)) === 'granted') {
      setPermissionStatus('granted');
      return true;
    }

    // The user didn't grant permission, so return false.
    setPermissionStatus('denied');
    return false;
  };

  const saveFile = async () => {
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
        // Verify/Request permission before writing
        const hasPermission = await verifyPermission(fileHandle, true);
        if (!hasPermission) {
          setToast({ message: 'Write permission denied. Saving as new file.', type: 'error' });
          // Fallthrough to download logic? Or just return?
          // User requested explicit save, so maybe we should confirm download if permission denied?
          if (!confirm("Permission denied. Download changes as a new file?")) {
            return;
          }
          // Fallthrough to download
        } else {
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
          // Success Logic
          setToast({ message: 'File saved successfully!', type: 'success' });
          setOriginalData(structuredClone(data));

          // Transition to Saved State
          const currentPendingItems = flatItems.filter(item => unsavedPaths.has(item.path));
          setSavedItemsSnapshot(currentPendingItems);
          setIsSavedState(true);
          setUnsavedPaths(new Set());
          return;
        }
      }

      // Fallback or Read-Only mode
      if (!fileHandle && !confirm("This file is in Read-Only mode. Download changes as a new file?")) {
        return;
      }

      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'edited_data.json';
      a.click();
      URL.revokeObjectURL(url);


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

      // Parse JSON objects/arrays, otherwise keep as string
      let finalValue: any = valueStr;
      if (valueStr.startsWith('{') || valueStr.startsWith('[')) {
        try { finalValue = JSON.parse(valueStr); } catch { }
      }
      // All other values remain as strings

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
    if (!originalData) return;
    if (confirm("Are you sure you want to discard all pending changes?")) {
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
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${permissionStatus === 'granted'
                      ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                      : 'text-amber-600 bg-amber-50 border-amber-100'
                      }`} title={permissionStatus === 'granted' ? "Changes will be saved directly to the file" : "Write permission needed (click Save to request)"}>
                      <LockOpen size={10} />
                      {permissionStatus === 'granted' ? 'EDITABLE' : 'EDITABLE (NEEDS PERMISSION)'}
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
              onFormatChange={(format) => {
                setPathFormat(format);
                localStorage.setItem('pathFormat', format);
              }}
            />

            {/* Pending Changes / Saved Changes Block */}
            {showPendingBlock && (
              <div className={`border rounded-xl shadow-sm overflow-hidden mb-2 animate-fade-in-up ${isSavedState ? 'bg-gray-50 border-gray-300' : 'bg-white border-emerald-200'
                }`}>
                <div className={`px-4 py-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 ${isSavedState ? 'bg-gray-100 border-gray-200' : 'bg-emerald-50 border-emerald-100'
                  }`}>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ring-1 ${isSavedState ? 'bg-white text-gray-500 ring-gray-200' : 'bg-white text-emerald-600 ring-emerald-200'
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
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border rounded-lg transition ${isSavedState
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
                          className={`flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm hover:shadow-md transition active:scale-95 flex-1 sm:flex-none ${fileHandle
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
                <div className={`p-0 border-t ${isSavedState ? 'bg-gray-50 border-gray-200' : 'bg-emerald-50/20 border-emerald-50'
                  }`}>
                  {(() => {
                    const groupedItems = groupItemsByParent(pendingBlockItems, pathFormat);

                    const handleCopySingleKey = (path: string) => {
                      navigator.clipboard.writeText(path);
                      setToast({ message: 'Key copied to clipboard', type: 'success' });
                    };

                    return groupedItems.map((group, groupIndex) => (
                      <div key={group.parentPath || 'root'} className="border-b border-gray-100 last:border-0">
                        {/* Group Header - only show if there are multiple items in the group */}
                        {group.items.length > 1 && (
                          <div className="px-3 py-2 bg-gray-100/50 border-b border-gray-200">
                            <div className="text-xs font-mono font-bold text-indigo-600">
                              {group.displayName}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {group.items.length} items
                            </div>
                          </div>
                        )}

                        {/* Group Items */}
                        {group.items.map((item) => {
                          const isGrouped = group.items.length > 1;
                          const formattedPath = formatFullPath(item.path, pathFormat);

                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-black/5 transition ${isGrouped ? 'pl-6' : ''
                                }`}
                            >
                              <div className="flex-1 min-w-0 mr-4">
                                {isGrouped ? (
                                  <>
                                    {/* Full path in gray text - only for grouped items */}
                                    <div className="text-[10px] font-mono text-gray-400 mb-1 truncate" title={formattedPath}>
                                      {formattedPath}
                                    </div>

                                    {/* Key name - child name for grouped items */}
                                    <div className="text-xs font-mono font-bold text-slate-700 truncate">
                                      <span>
                                        <span className="text-gray-400">→</span> {getChildName(item.path)}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Full path in indigo - for ungrouped items */}
                                    <div className="text-xs font-mono font-bold text-indigo-600 truncate" title={formattedPath}>
                                      {formattedPath}
                                    </div>
                                  </>
                                )}

                                {/* Value */}
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

                              {/* Action buttons */}
                              <div className="flex items-center gap-1">
                                {/* Copy key button */}
                                <button
                                  onClick={() => handleCopySingleKey(formattedPath)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                  title="Copy key"
                                >
                                  <Copy size={14} />
                                </button>

                                {/* Edit button - only in pending state */}
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
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Main List Header */}
            <div className="flex items-center justify-between px-2 pt-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Info size={18} className="text-indigo-500" />
                Structure Content
                <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full">
                  {flatItems.length} Keys
                </span>
              </h2>
              <div className="flex items-center gap-3">
                {isProcessing && <RefreshCw size={16} className="animate-spin text-indigo-500" />}
                <select
                  value={pathFormat}
                  onChange={(e) => {
                    setPathFormat(e.target.value as PathFormat);
                    localStorage.setItem('pathFormat', e.target.value);
                  }}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition cursor-pointer"
                  title="Select path display format"
                >
                  {Object.entries(PATH_FORMAT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <JsonListView items={flatItems} searchQuery={searchQuery} highlightPaths={unsavedPaths} pathFormat={pathFormat} />

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
