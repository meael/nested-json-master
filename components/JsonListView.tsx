import React from 'react';
import { FlatEntry } from '../types';
import { Copy } from 'lucide-react';

interface JsonListViewProps {
  items: FlatEntry[];
  searchQuery: string;
}

const JsonListView: React.FC<JsonListViewProps> = ({ items, searchQuery }) => {
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    // Allow matching by path (banking:tax) or value
    const pathMatch = item.path.toLowerCase().includes(query) || item.path.toLowerCase().includes(query.replace(/:/g, '->'));
    const valueMatch = String(item.value).toLowerCase().includes(query);
    return pathMatch || valueMatch;
  });

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>No keys match your search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-12">
      {filteredItems.map((item) => (
        <div 
          key={item.id} 
          className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Path Breadcrumbs */}
            <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-1 font-mono">
              {item.keys.map((k, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-gray-300">→</span>}
                  <span className={`${i === item.keys.length - 1 ? 'text-indigo-600 font-bold bg-indigo-50 px-1 rounded' : ''}`}>
                    {k}
                  </span>
                </React.Fragment>
              ))}
            </div>
            
            {/* Raw Path String (User preferred format) */}
            <div className="text-xs text-gray-400 select-all truncate mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.path}
            </div>
          </div>

          {/* Value Section */}
          <div className="sm:max-w-[50%] w-full flex items-center justify-between sm:justify-end gap-3 bg-gray-50 p-2 rounded border border-gray-100">
             <div className="truncate font-mono text-sm text-slate-800" title={JSON.stringify(item.value)}>
                {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}
             </div>
             <button 
                onClick={() => navigator.clipboard.writeText(String(item.value))}
                className="text-gray-400 hover:text-indigo-600 transition p-1"
                title="Copy Value"
             >
                 <Copy size={14} />
             </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JsonListView;