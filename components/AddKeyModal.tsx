import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Plus, Pencil } from 'lucide-react';
import { parsePath, formatPath } from '../utils/pathFormat';

interface AddKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (path: string, value: string, allowOverwrite: boolean) => void;
  isProcessing: boolean;
  externalError?: string | null;
  initialPath?: string;
  initialValue?: any;
  mode?: 'add' | 'edit';
}

const AddKeyModal: React.FC<AddKeyModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  isProcessing,
  externalError,
  initialPath = '',
  initialValue = '',
  mode = 'add'
}) => {
  const [pathInput, setPathInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [parsedPath, setParsedPath] = useState<string[]>([]);

  // Initialize form state when opening or when props change
  useEffect(() => {
    if (isOpen) {
      setPathInput(initialPath);
      // Handle objects/arrays for value input
      const valStr = typeof initialValue === 'object' ? JSON.stringify(initialValue, null, 2) : String(initialValue);
      setValueInput(valStr);
      setLocalError(null);
    }
  }, [isOpen, initialPath, initialValue]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    setParsedPath(parsePath(pathInput));
    if (pathInput.trim()) setLocalError(null);
  }, [pathInput]);

  useEffect(() => {
    if (valueInput.trim()) setLocalError(null);
  }, [valueInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) {
      setLocalError('Key path is required');
      return;
    }
    if (parsedPath.length === 0) {
      setLocalError('Invalid key path format');
      return;
    }
    if (!valueInput.trim()) {
      setLocalError('Value is required');
      return;
    }

    // In edit mode, we allow overwrite
    onAdd(pathInput, valueInput, mode === 'edit');
  };

  if (!isOpen) return null;

  // Combine local validation errors and external worker errors
  const displayError = localError || externalError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-slate-800">
            {mode === 'edit' ? 'Edit Value' : 'Add New Key'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

          {/* Path Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Key Path <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus={mode === 'add'}
              readOnly={mode === 'edit'} // Usually we don't rename keys in "Edit Value" mode, but could be changed if needed
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value.replace(/[^a-zA-Z:.\->]/g, ''))}
              placeholder="banking:taxPayment->newKey"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition font-mono text-sm ${displayError && !pathInput.trim() ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-indigo-500'
                } ${mode === 'edit' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
            />
            {/* Preview */}
            {parsedPath.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mt-1">
                <span>Preview:</span>
                {parsedPath.map((seg, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-gray-300">→</span>}
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{seg}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Value Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Value <span className="text-red-500">*</span>
            </label>
            <textarea
              autoFocus={mode === 'edit'}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="Enter translation string or value..."
              rows={6}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition text-sm resize-none whitespace-pre-wrap font-mono ${displayError ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-indigo-500'
                }`}
            />
          </div>

          {/* Error Message Display Area */}
          {displayError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse">
              <AlertCircle size={16} className="shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {isProcessing ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              ) : (
                mode === 'edit' ? <Pencil size={18} /> : <Plus size={18} />
              )}
              {mode === 'edit' ? 'Update' : 'Add Key'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddKeyModal;