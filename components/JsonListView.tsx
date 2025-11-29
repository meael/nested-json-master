import React, { useEffect, useState, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { FlatEntry } from '../types';
import { PathFormat, formatPathAs } from '../utils/pathFormatter';

interface JsonListViewProps {
  items: FlatEntry[];
  searchQuery: string;
  highlightPaths?: Set<string>;
  pathFormat?: PathFormat;
}

const ITEM_HEIGHT = 70; // Approximation including margin/border
const OVERSCAN = 10;

const JsonListView: React.FC<JsonListViewProps> = ({ items, searchQuery = '', highlightPaths, pathFormat }) => {
  const [filteredItems, setFilteredItems] = useState<FlatEntry[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredItems(items);
      return;
    }
    const query = searchQuery.toLowerCase();
    const result = items.filter(item => {
      // Check original path format
      const pathMatch = item.path.toLowerCase().includes(query);

      // Also check all possible formatted versions
      const formats: PathFormat[] = ['colon', 'bracket', 'dot', 'arrow', 'jsonpath', 'lodash'];
      const formattedPathMatch = formats.some(format => {
        const formatted = formatPathAs(item.keys, format).toLowerCase();
        return formatted.includes(query);
      });

      const valueMatch = String(item.value).toLowerCase().includes(query);
      return pathMatch || formattedPathMatch || valueMatch;
    });
    setFilteredItems(result);
  }, [items, searchQuery]);

  // Handle Window Scroll for Virtualization
  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial calculation
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate visible range
  const containerTop = containerRef.current?.offsetTop || 300;
  // Allow for generous buffer for smoother scrolling
  const relativeScroll = Math.max(0, scrollTop - containerTop + 800);
  const windowHeight = window.innerHeight;

  const startIndex = Math.max(0, Math.floor(relativeScroll / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    filteredItems.length,
    Math.ceil((relativeScroll + windowHeight) / ITEM_HEIGHT) + OVERSCAN
  );

  const visibleItems = filteredItems.slice(startIndex, endIndex);
  const totalHeight = filteredItems.length * ITEM_HEIGHT;
  const offsetY = startIndex * ITEM_HEIGHT;

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>No keys match your search.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ height: totalHeight }}>
      <div
        className="absolute top-0 left-0 right-0"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {visibleItems.map((item, index) => (
          <RowItem
            key={item.id}
            item={item}
            isHighlighted={highlightPaths?.has(item.path)}
            pathFormat={pathFormat}
          />
        ))}
      </div>
    </div>
  );
};

const RowItem: React.FC<{ item: FlatEntry; isHighlighted?: boolean; pathFormat: PathFormat }> = ({ item, isHighlighted, pathFormat }) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedVal, setCopiedVal] = useState(false);

  const displayPath = formatPathAs(item.keys, pathFormat);

  const copyText = (text: string, isKey: boolean) => {
    navigator.clipboard.writeText(text);
    if (isKey) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedVal(true);
      setTimeout(() => setCopiedVal(false), 2000);
    }
  };

  const displayValue = typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : String(item.value);

  return (
    <div
      className={`group bg-white border rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition duration-200 flex flex-col sm:flex-row sm:items-start justify-between gap-2 min-h-[90px] mb-[4px] ${isHighlighted ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200' : 'border-gray-200'
        }`}
    >
      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
        {/* Path String */}
        <div className="flex items-center gap-2">
          <div
            className={`text-xs font-mono px-2 py-1 rounded truncate select-all cursor-pointer transition ${isHighlighted
              ? 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200'
              : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
            onClick={() => copyText(displayPath, true)}
            title="Click to copy key path"
          >
            {displayPath}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); copyText(displayPath, true); }}
            className="text-gray-300 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100"
            title="Copy Path"
          >
            {copiedKey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Value Section */}
      <div className={`sm:max-w-[50%] w-full flex justify-between sm:justify-end rounded border h-full ${isHighlighted ? 'bg-white border-emerald-100' : 'bg-gray-50 border-gray-100'
        }`}>
        <div className="font-mono text-sm text-slate-800 flex-1 cursor-pointer transition-colors hover:text-indigo-600 px-3 py-2" title={String(item.value)} onClick={() => copyText(displayValue, false)}>
          <div
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as any,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              whiteSpace: 'pre-line',
            }}
          >
            {typeof item.value === 'object' ? <span className="text-gray-400 italic">Object/Array</span> : String(item.value)}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); copyText(displayValue, false); }}
          className="text-gray-300 px-3 py-2 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100"
          title="Copy Value"
        >
          {copiedVal ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
};

export default JsonListView;