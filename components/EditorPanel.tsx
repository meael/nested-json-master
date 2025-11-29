import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { detectPathFormat, PathFormat } from '../utils/pathFormatter';

interface EditorPanelProps {
  onOpenAddModal: () => void;
  onSearch: (query: string) => void;
  onFormatChange?: (format: PathFormat) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ onOpenAddModal, onSearch, onFormatChange }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    onSearch(q);
    
    // Auto-detect format from search query and update display
    // Only if it looks like a path (not regular text)
    if (q.trim() && onFormatChange) {
      const detectedFormat = detectPathFormat(q);
      if (detectedFormat) {
        onFormatChange(detectedFormat);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-4 sticky top-20 z-20 mb-6">
      
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search keys (e.g. 'banking:tax') or values..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
        />
      </div>

      {/* Open Add Modal Button */}
      <button
        onClick={onOpenAddModal}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-sm hover:shadow active:scale-95 whitespace-nowrap font-medium text-sm"
      >
        <Plus size={18} />
        Add Key
      </button>

    </div>
  );
};

export default EditorPanel;