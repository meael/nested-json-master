import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Circle, Box, Type } from 'lucide-react';

interface JsonTreeViewProps {
  data: any;
  name?: string;
  isRoot?: boolean;
  highlightPath?: string;
}

const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, name, isRoot = false, highlightPath }) => {
  const [isOpen, setIsOpen] = useState(isRoot);

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data).length === 0;

  // Determine if this specific node matches a search highlight
  // (In a real full implementation, we would pass down specific highlight flags)
  const isMatch = highlightPath && name && highlightPath.includes(name);

  if (!isObject) {
    let valueColor = "text-blue-600";
    let Icon = Type;
    if (typeof data === 'number') { valueColor = "text-emerald-600"; Icon = Circle; }
    if (typeof data === 'boolean') { valueColor = "text-purple-600"; Icon = Box; }
    if (data === null) valueColor = "text-gray-500";

    return (
      <div className={`flex items-center ml-4 py-1 hover:bg-gray-100 rounded px-2 ${isMatch ? 'bg-yellow-100' : ''}`}>
        <span className="text-gray-400 mr-2">
           <Icon size={12} />
        </span>
        {name && <span className="font-medium text-slate-700 mr-2">{name}:</span>}
        <span className={`${valueColor} font-mono break-all`}>{JSON.stringify(data)}</span>
      </div>
    );
  }

  return (
    <div className="ml-4">
      <div 
        className={`flex items-center cursor-pointer py-1 hover:bg-gray-100 rounded px-2 ${isMatch ? 'bg-yellow-100' : ''}`}
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
      >
        <span className="text-gray-500 mr-1">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        {name && <span className="font-bold text-slate-800 mr-2">{name}</span>}
        <span className="text-xs text-gray-400">
          {isArray ? `[${data.length}]` : `{${Object.keys(data).length}}`}
        </span>
      </div>

      {isOpen && !isEmpty && (
        <div className="border-l border-gray-200 ml-2">
          {Object.entries(data).map(([key, value]) => (
            <JsonTreeView 
                key={key} 
                data={value} 
                name={key} 
                highlightPath={highlightPath}
            />
          ))}
        </div>
      )}
      {isOpen && isEmpty && <div className="ml-8 text-gray-400 text-sm italic">Empty</div>}
    </div>
  );
};

export default JsonTreeView;