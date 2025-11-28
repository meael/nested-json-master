import React, { useState, useEffect } from 'react';
import { Plus, Search, ArrowRight, CornerDownRight } from 'lucide-react';
import { PathSegment } from '../types';
import { parsePathKey } from '../utils/jsonLogic';

interface EditorPanelProps {
  onAddKey: (path: string, value: string) => void;
  onSearch: (query: string) => void;
  lastError: string | null;
  lastSuccess: string | null;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ onAddKey, onSearch, lastError, lastSuccess }) => {
  const [pathInput, setPathInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [parsedPath, setParsedPath] = useState<PathSegment[]>([]);

  // Live preview of parsing
  useEffect(() => {
    setParsedPath(parsePathKey(pathInput));
  }, [pathInput]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) return;
    onAddKey(pathInput, valueInput);
    // Optional: clear inputs on success if handled by parent, but we keep them for now or clear them if success changes?
    // We'll leave them to allow rapid entry of similar keys
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    onSearch(q);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col mb-6 overflow-visible z-20">
      
      {/* Top Row: Add Key Form */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
        <form onSubmit={handleAdd} className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          
          <div className="flex-1 w-full relative group">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
               New Key Path
            </label>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="banking:taxPayment->newKey"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono text-sm ${lastError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            />
            {/* Hover/Focus Parse Preview */}
            {parsedPath.length > 0 && (
              <div className="absolute top-full left-0 mt-1 hidden group-focus-within:flex flex-wrap items-center gap-1 text-xs text-gray-600 bg-white p-2 rounded shadow-lg border border-gray-200 z-50">
                  <span className="text-gray-400 mr-1">Path:</span>
                {parsedPath.map((seg, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-gray-300">→</span>}
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">{seg}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <div className="flex-[2] w-full">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Value</label>
            <div className="relative">
                <input
                    type="text"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    placeholder="Value..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={parsedPath.length === 0}
            className="w-full lg:w-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-[38px]"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Add Key</span>
          </button>
        </form>
        
        {/* Error/Success Feedback embedded below form */}
        {(lastError || lastSuccess) && (
            <div className={`mt-2 text-xs flex items-center ${lastError ? 'text-red-600' : 'text-emerald-600'}`}>
                {lastError ? (
                    <>
                        <span className="font-bold mr-1">Error:</span> {lastError}
                    </>
                ) : (
                    <>
                        <span className="font-bold mr-1">Success:</span> {lastSuccess}
                    </>
                )}
            </div>
        )}
      </div>

      {/* Bottom Row: Search & Filters */}
      <div className="px-4 py-3 bg-white rounded-b-xl flex items-center gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search keys (e.g. 'taxPayment->section') or values..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition"
          />
        </div>
        <div className="text-xs text-gray-400 hidden sm:block">
            Showing all matching nested keys
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;