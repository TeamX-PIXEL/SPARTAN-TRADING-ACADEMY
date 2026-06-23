"use client";

import React, { useState } from "react";
import { useApp } from "@/portal/AppContext";
import { ShoppingCart, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RazorpayModal } from "./RazorpayModal";

interface CartLibraryPanelProps {
  isOpen: boolean; // Relevant on Mobile/Tablet drawer mode
  onClose: () => void;
  onOpenProduct: (id: string) => void;
}

export const CartLibraryPanel: React.FC<CartLibraryPanelProps> = ({ isOpen, onClose, onOpenProduct }) => {
  const { cart, removeFromCart, checkout, user, addToast } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  const handleCheckoutInitiation = () => {
    const hasNonCourse = cart.some(item => item.type !== "course");
    if (hasNonCourse && (!user?.tvid || user.tvid.trim() === "")) {
      addToast("TradingView ID is required for indicators and bots. Please register yours in account settings first.", 'error');
      return;
    }
    setIsRazorpayOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    try {
      setIsProcessing(true);
      await checkout();
      // Auto close cart drawer after successful checkout
      onClose();
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 select-none">
          {/* Backdrop lock - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#07080a]/85 backdrop-blur-sm cursor-pointer"
          />

          {/* Sliding Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-sm sm:max-w-md bg-[#0c0d0f]/95 backdrop-blur-md border-l border-[#1e222b] flex flex-col h-full shadow-2xl"
          >
            {/* Drawer Title Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#1e222b] mt-0.5">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-mono cursor-pointer transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-neutral-400" />
                <span>Close Panel</span>
              </button>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-neutral-400" />
                <span className="text-xs uppercase font-mono tracking-widest text-[#4e5a70]">
                  Cart ({cart.length})
                </span>
              </div>
            </div>

            {/* Cart Content */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                  <div className="w-14 h-14 rounded-full bg-[#12151c] flex items-center justify-center text-neutral-600 mb-4 border border-[#1e222b]">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <h3 className="text-neutral-300 text-sm font-semibold tracking-wide">Cart is vacant</h3>
                  <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed max-w-xs">
                    Add premium courses, TradingView indicators, or systematic execution bots to start scaling.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto split-scroll px-4 py-4 space-y-3.5">
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="flex items-center gap-3.5 p-3 rounded-xl bg-[#12151c]/60 border border-[#1e222b] hover:border-blue-900/30 transition-all group"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-lg object-contain bg-neutral-900 border border-white/5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] uppercase font-mono tracking-widest font-semibold text-blue-400 block mb-0.5">
                          {item.type}
                        </span>
                        <h4 className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-xs font-mono font-medium text-neutral-400 block mt-1">
                          ${item.price}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-950/20 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Cart Checkout Footer */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-[#1e222b] bg-[#0c0d0f]">
                  <div className="space-y-2 mb-4 font-mono">
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>Subtotal:</span>
                      <span>${calculateTotal()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>Platform fee:</span>
                      <span className="text-emerald-500">FREE</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-white pt-2 border-t border-[#1e222b]">
                      <span>TOTAL DUE:</span>
                      <span className="text-blue-400">${calculateTotal()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCheckoutInitiation}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer active:scale-98 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Securing Script...</span>
                      </>
                    ) : (
                      <>
                        <span>Secure Checkout</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {isRazorpayOpen && (
        <RazorpayModal
          key="razorpay-modal"
          isOpen={isRazorpayOpen}
          onClose={() => setIsRazorpayOpen(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </AnimatePresence>
  );
};

export default CartLibraryPanel;
