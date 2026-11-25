import React from 'react';
import { CheckCircle2, AlertTriangle, Info, Flame, X } from 'lucide-react';
import { useMachines } from '../../context/MachineContext.jsx';

const TOAST_STYLES = {
  success: {
    container: 'border-emerald-500/40 bg-slate-900/95 text-emerald-200 shadow-emerald-950/50',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
  },
  warning: {
    container: 'border-amber-500/40 bg-slate-900/95 text-amber-200 shadow-amber-950/50',
    icon: Flame,
    iconColor: 'text-amber-400',
  },
  error: {
    container: 'border-red-500/40 bg-slate-900/95 text-red-200 shadow-red-950/50',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
  },
  info: {
    container: 'border-blue-500/40 bg-slate-900/95 text-slate-200 shadow-blue-950/50',
    icon: Info,
    iconColor: 'text-blue-400',
  },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useMachines();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-toast-in flex items-start gap-2.5 px-3.5 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${style.container}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="text-xs font-bold text-white leading-tight">{toast.title}</p>
              )}
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-500 hover:text-white p-0.5 rounded transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
