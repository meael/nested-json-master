import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
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
  const [parsedPath, setParsedPath] = useState<PathSegment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Live preview of parsing
  useEffect(() => {
    setParsedPath(parsePathKey(pathInput));
  }, [pathInput]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) return;
    onAddKey(pathInput, valueInput);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    onSearch(q);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-semibold text-gray-800">Manipulation Tools</h2>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto flex-1">
        
        {/* Status Messages */}
        {lastError && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start">
            <AlertCircle size={16} className="mt-0.5 mr-2 shrink-0" />
            {lastError}
          </div>
        )}
        {lastSuccess && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-start">
            <CheckCircle size={16} className="mt-0.5 mr-2 shrink-0" />
            {lastSuccess}
          </div>
        )}

        {/* Add Key Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Add Nested Key</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Path Key String</label>
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="banking:taxPayment->newSection"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
              {/* Path Visualization */}
              {parsedPath.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                    <span className="font-semibold text-gray-400">Preview Structure:</span>
                  {parsedPath.map((seg, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ArrowRight size={10} className="text-gray-300" />}
                      <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono">
                        {seg}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <textarea
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder="String value or JSON..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tip: Inputs starting with <code>&#123;</code> or <code>[</code> will be parsed as JSON.
              </p>
            </div>

            <button
              type="submit"
              disabled={parsedPath.length === 0}
              className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              Add Key
            </button>
          </form>
        </div>

        <hr className="border-gray-100" />

        {/* Search Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Search Structure</h3>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by key path or value..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
          <div className="text-xs text-gray-500">
             Matches paths like <code>banking:tax</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;