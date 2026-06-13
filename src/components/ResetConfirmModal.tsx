import { AlertTriangle, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetConfirmModal({ isOpen, onClose, onConfirm }: ResetConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Box */}
      <div className="relative w-full max-w-md transform rounded-2xl border border-red-500/20 dark:border-red-500/30 bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all duration-300 animate-in fade-in-50 zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 ring-4 ring-red-500/5 mb-4 animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Are you sure?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
            This will permanently delete all your trading data, local configurations, and custom account balances. This action is irreversible.
          </p>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/60">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="rounded-xl bg-red-500 py-2.5 text-xs font-extrabold text-white hover:bg-red-600 shadow-lg shadow-red-500/10 transition-all duration-200"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
