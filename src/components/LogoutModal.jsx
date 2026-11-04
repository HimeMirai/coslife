import { LogOut, X, Save } from 'lucide-react';

export default function LogoutModal({ isOpen, onClose, onConfirmSaveAndLogout, onConfirmLogoutNoSave }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <LogOut className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Logging Out</h3>
            <p className="text-xs text-slate-400">Save your workspace progress?</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Would you like to save your current project changes and budget updates before logging out?
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirmLogoutNoSave}
            className="flex-1 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            Discard & Log Out
          </button>

          <button
            onClick={onConfirmSaveAndLogout}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save & Log Out
          </button>
        </div>
      </div>
    </div>
  );
}