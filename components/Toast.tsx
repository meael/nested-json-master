import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        type === 'success' ? 'bg-white border-emerald-200 text-slate-800' : 'bg-white border-red-200 text-slate-800'
      }`}>
        {type === 'success' ? (
          <CheckCircle className="text-emerald-500" size={20} />
        ) : (
          <AlertCircle className="text-red-500" size={20} />
        )}
        <p className="text-sm font-medium pr-2">{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;