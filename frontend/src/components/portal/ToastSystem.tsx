"use client";

import React from "react";
import { useApp } from "@/portal/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const ToastSystem: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm px-4 md:px-0 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-neutral-900/95 backdrop-blur-md shadow-2xl text-white border-white/10 dark:text-neutral-100"
              id={`toast-${toast.id}`}
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : isError ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : (
                  <Info className="w-5 h-5 text-blue-400" />
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium tracking-wide">
                  {isSuccess ? "Success" : isError ? "Alert" : "Notification"}
                </p>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  {toast.text}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-0.5 rounded-lg hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
export default ToastSystem;
