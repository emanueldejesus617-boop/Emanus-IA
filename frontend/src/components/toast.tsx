"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    custom: (item: Omit<ToastItem, "id">) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Máximo de 5 simultâneos

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (title: string, message?: string, duration?: number) =>
        addToast("success", title, message, duration),
      error: (title: string, message?: string, duration?: number) =>
        addToast("error", title, message, duration || 5500),
      warning: (title: string, message?: string, duration?: number) =>
        addToast("warning", title, message, duration),
      info: (title: string, message?: string, duration?: number) =>
        addToast("info", title, message, duration),
      custom: (item: Omit<ToastItem, "id">) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts((prev) => [...prev.slice(-4), { ...item, id }]);
        const d = item.duration ?? 4500;
        if (d > 0) {
          setTimeout(() => removeToast(id), d);
        }
      },
    }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser utilizado dentro de um ToastProvider");
  }
  return context;
}

interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function Toaster({ toasts, onDismiss }: ToasterProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((item) => {
        const config = getToastConfig(item.type);
        const Icon = config.icon;

        return (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 animate-slide-in-right ${config.containerClasses}`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${config.iconWrapperClasses}`}>
              <Icon className={`w-4 h-4 ${config.iconClasses}`} />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <h5 className="text-xs sm:text-sm font-bold text-text leading-tight">{item.title}</h5>
              {item.message && (
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 leading-relaxed break-words">
                  {item.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 p-1 rounded-lg text-muted hover:text-text hover:bg-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function getToastConfig(type: ToastType) {
  switch (type) {
    case "success":
      return {
        icon: CheckCircle2,
        containerClasses: "bg-surface/95 border-[#087F63]/30 text-text shadow-[#087F63]/5",
        iconWrapperClasses: "bg-[#087F63]/15 text-[#087F63]",
        iconClasses: "text-[#087F63]",
      };
    case "error":
      return {
        icon: AlertCircle,
        containerClasses: "bg-surface/95 border-red-500/35 text-text shadow-red-500/5",
        iconWrapperClasses: "bg-red-500/15 text-red-500",
        iconClasses: "text-red-500",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        containerClasses: "bg-surface/95 border-amber-500/35 text-text shadow-amber-500/5",
        iconWrapperClasses: "bg-amber-500/15 text-amber-500",
        iconClasses: "text-amber-500",
      };
    case "info":
    default:
      return {
        icon: Info,
        containerClasses: "bg-surface/95 border-blue-500/30 text-text shadow-blue-500/5",
        iconWrapperClasses: "bg-blue-500/15 text-blue-500",
        iconClasses: "text-blue-500",
      };
  }
}
