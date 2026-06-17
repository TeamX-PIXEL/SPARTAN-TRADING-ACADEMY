"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/portal/AppContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, CreditCard, Smartphone, Building2, Wallet, 
  Lock, Shield, CheckCircle, Loader2, ArrowRight, 
  QrCode, AlertCircle, Info, Sparkles 
} from 'lucide-react';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet';

export const RazorpayModal: React.FC<RazorpayModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { cart, user } = useApp();
  const [activeTab, setActiveTab] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // States for Card Form
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardError, setCardError] = useState('');

  // States for UPI
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrTimer, setQrTimer] = useState(300); // 5 minutes timer

  // States for Netbanking
  const [selectedBank, setSelectedBank] = useState('');

  // States for Wallet
  const [selectedWallet, setSelectedWallet] = useState('');

  // Calculations
  const calculateTotalUSD = () => {
    return cart.reduce((total, item) => total + item.price, 0);
  };

  const USD_TO_INR_RATE = 83.5;
  const totalUSD = calculateTotalUSD();
  const totalINR = Math.round(totalUSD * USD_TO_INR_RATE);

  // QR Code expiration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQrCode && qrTimer > 0) {
      interval = setInterval(() => {
        setQrTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showQrCode, qrTimer]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Raw interactive Card format handlers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const trimmed = raw.slice(0, 16);
    const formatted = trimmed.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    setCardError('');
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 4) raw = raw.slice(0, 4);

    if (raw.length >= 2) {
      const month = parseInt(raw.slice(0, 2), 10);
      if (month < 1 || month > 12) {
        setCardExpiry('12/');
        return;
      }
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
    setCardError('');
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCardCvv(raw);
    setCardError('');
  };

  // Determine card icon type dynamically
  const getCardBrandImg = () => {
    const digits = cardNumber.replace(/\s+/g, '');
    if (digits.startsWith('4')) return 'Visa';
    if (digits.startsWith('5')) return 'Mastercard';
    if (digits.startsWith('3')) return 'Amex';
    if (digits.startsWith('6')) return 'Rupay';
    return null;
  };

  // Handle pay trigger validation
  const validateAndPay = async () => {
    if (activeTab === 'card') {
      const cleanedCard = cardNumber.replace(/\s+/g, '');
      if (cleanedCard.length !== 16) {
        setCardError('Please enter a valid 16-digit card number.');
        return;
      }
      if (cardExpiry.length !== 5) {
        setCardError('Please enter a valid expiration date (MM/YY).');
        return;
      }
      if (cardCvv.length !== 3) {
        setCardError('Please enter a 3-digit CVV number.');
        return;
      }
      if (!cardName.trim()) {
        setCardError('Please enter the cardholder name.');
        return;
      }
    } else if (activeTab === 'upi') {
      if (!upiId.includes('@') && !showQrCode) {
        setUpiError('Please enter a valid UPI ID (e.g. user@okhdfcbank or user@paytm)');
        return;
      }
    } else if (activeTab === 'netbanking') {
      if (!selectedBank) {
        alert('Please select a corresponding Indian Bank.');
        return;
      }
    } else if (activeTab === 'wallet') {
      if (!selectedWallet) {
        alert('Please select a secure digital wallet.');
        return;
      }
    }

    // Trigger simulation pipeline
    setIsProcessing(true);
    setProcessStep(1);

    // Step 1: Initializing
    setTimeout(() => {
      setProcessStep(2); // Contacting bank / clearing networks
      
      setTimeout(() => {
        setProcessStep(3); // Injecting OTP security pass

        setTimeout(() => {
          setProcessStep(4); // Razorpay signature match

          setTimeout(async () => {
            setPaymentSuccess(true);
            setIsProcessing(false);
            
            // Invoke the original AppContext checkout which syncs the state with DB
            try {
              await onSuccess();
            } catch (err) {
              console.error("Cart synchronization failed", err);
            }
          }, 1100);
        }, 1200);
      }, 1300);
    }, 1100);
  };

  const handleQuickFillCard = () => {
    setCardNumber('4111 2222 3333 4444');
    setCardExpiry('12/28');
    setCardCvv('999');
    setCardName(user?.name || 'Marcus Aurelius');
    setCardError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Main Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-3xl bg-[#0b0c10] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[580px] md:h-[500px]"
        >
          {/* Header for Razorpay brand banner top bar on mobile */}
          <div className="md:hidden bg-[#18202c] border-b border-white/5 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#3399cc] flex items-center justify-center text-white text-xs font-bold font-mono">
                R
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Razorpay Checkout</h4>
                <p className="text-[9px] text-[#3399cc] font-mono leading-none">DealDeck Live Gateway</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Left panel: Cart Summary and Razorpay identity */}
          <div className="w-full md:w-[280px] bg-[#0c0d12] border-b md:border-b-0 md:border-r border-white/5 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-4">
              {/* Desktop Brand Marker */}
              <div className="hidden md:flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#3399cc] flex items-center justify-center text-white text-sm font-bold font-mono shadow-md shadow-[#3399cc]/10">
                  R
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Razorpay Checkout</h3>
                  <div className="flex items-center gap-1.5 text-[#3399cc] text-[9px] font-mono font-bold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>SECURE TRANSACTION</span>
                  </div>
                </div>
              </div>

              {/* Order items detail listing */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#4e5a70] font-bold block">
                  Interactive Invoice Items ({cart.length})
                </span>
                <div className="space-y-2 max-h-[160px] md:max-h-[220px] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex gap-2.5 items-center bg-white/2 p-2 rounded-lg border border-white/5">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded object-contain bg-neutral-900 border border-white/5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-semibold text-white/90 truncate leading-none mb-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-500/10 leading-none">
                            {item.type}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 font-bold">
                            ${item.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price breakdown and checkout total */}
            <div className="pt-4 border-t border-white/5 space-y-2 font-mono">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Subtotal (INR):</span>
                <span>₹{totalINR.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Platform fees:</span>
                <span className="text-emerald-500 uppercase text-[10px] font-bold bg-emerald-950/30 px-1 py-0.5 rounded">FREE</span>
              </div>
              <div className="pt-2 border-t border-white/5 flex flex-col text-right">
                <div className="flex justify-between items-baseline text-white">
                  <span className="text-[11px] text-neutral-300 font-semibold font-sans">TOTAL DUE:</span>
                  <p className="text-base text-[#3399cc] font-extrabold font-mono">₹{totalINR.toLocaleString('en-IN')}</p>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium">
                  ≈ ₹{totalINR.toLocaleString('en-IN')} INR
                </p>
                <span className="text-[8px] text-[#4e5a70] block mt-1 uppercase text-left tracking-tight">
                  Guaranteed safe payment clearance
                </span>
              </div>
            </div>
          </div>

          {/* Right panel: Live inputs, tabs, processing & dynamic QR states */}
          <div className="flex-1 bg-[#090a0d] flex flex-col justify-between overflow-hidden relative">
            <button 
              type="button"
              onClick={onClose} 
              className="absolute right-4 top-2 z-10 hidden md:block p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-all hover:scale-105 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* LOADING PIPELINE STATE OVERLAY */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#07080a] z-50 flex flex-col items-center justify-center p-6 text-center select-none"
                >
                  <Loader2 className="w-10 h-10 animate-spin text-[#3399cc] mb-4.5" />
                  <h3 className="text-white text-sm font-semibold tracking-wide">Razorpay Safe Security Gate</h3>
                  <p className="text-[11px] text-[#3399cc] font-mono mt-1 font-semibold uppercase tracking-wider">
                    Securing payment...
                  </p>

                  <div className="w-[200px] h-1.5 bg-neutral-900 border border-white/5 rounded-full mt-4 overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[#3399cc] to-emerald-500"
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: 
                          processStep === 1 ? '25%' : 
                          processStep === 2 ? '50%' : 
                          processStep === 3 ? '75%' : '100%' 
                      }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>

                  {/* Dynamic description lines */}
                  <div className="mt-4 font-mono text-[9px] text-[#4e5a70] h-6 flex items-center justify-center">
                    {processStep === 1 && "Connecting safe payment node tunnels..."}
                    {processStep === 2 && "Syncing with Clearing Network (NPCI)..."}
                    {processStep === 3 && "Verifying 3D-Secure 2FA OTP signature..."}
                    {processStep === 4 && "Authenticating token approvals..."}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SUCCESS STATE OVERLAY */}
            <AnimatePresence>
              {paymentSuccess && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute inset-0 bg-[#07080a] z-50 flex flex-col items-center justify-center p-6 text-center select-none"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 animate-bounce shrink-0 shadow-lg shadow-emerald-500/5">
                    <CheckCircle className="w-9 h-9" />
                  </div>
                  <h3 className="text-emerald-400 text-sm uppercase tracking-wider font-mono font-bold">
                    Payment Successful
                  </h3>
                  <p className="text-xs text-neutral-300 mt-2 leading-relaxed max-w-sm">
                    Verified by **Razorpay secure network**. The products have been successfully bound to your account and added to your license library.
                  </p>
                  
                  <div className="mt-4 flex flex-col items-center gap-1.5 font-mono text-[9px] text-[#4e5a70]">
                    <span>Transaction ID: RP_TX_{(Math.floor(100000 + Math.random() * 900000))}</span>
                    <span>Status: Clear • Registered</span>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] tracking-wider uppercase rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                  >
                    <span>Proceed to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MAIN CHECKOUT INTERFACE Content */}
            <div className="flex-1 flex flex-col">
              {/* Payment Tab selectors */}
              <div className="flex border-b border-white/5 bg-[#0a0c10] select-none md:pr-14">
                <button
                  type="button"
                  onClick={() => { setActiveTab('card'); setShowQrCode(false); }}
                  className={`flex-1 py-3 text-center flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all duration-200 border-b-2 cursor-pointer ${
                    activeTab === 'card' 
                      ? 'border-[#3399cc] text-white bg-white/2' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.01]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('upi'); }}
                  className={`flex-1 py-3 text-center flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all duration-200 border-b-2 cursor-pointer ${
                    activeTab === 'upi' 
                      ? 'border-[#3399cc] text-white bg-white/2' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.01]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('netbanking'); setShowQrCode(false); }}
                  className={`flex-1 py-3 text-center flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all duration-200 border-b-2 cursor-pointer ${
                    activeTab === 'netbanking' 
                      ? 'border-[#3399cc] text-white bg-white/2' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.01]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Banks</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('wallet'); setShowQrCode(false); }}
                  className={`flex-1 py-3 text-center flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all duration-200 border-b-2 cursor-pointer ${
                    activeTab === 'wallet' 
                      ? 'border-[#3399cc] text-white bg-white/2' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.01]'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Wallets</span>
                </button>
              </div>

              {/* Dynamic Form Area */}
              <div className="flex-1 p-6 overflow-y-auto">
                
                {/* 1. CARD FORM TAB */}
                {activeTab === 'card' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">
                        Credit or Debit Card Payments
                      </span>
                      <button
                        type="button"
                        onClick={handleQuickFillCard}
                        className="text-[9px] font-mono font-semibold text-[#3399cc] hover:text-[#287da8] border border-[#3399cc]/20 hover:border-[#3399cc]/40 bg-[#3399cc]/5 px-2 py-0.5 rounded transition-all cursor-pointer"
                      >
                        ⚡ Fill Demo Card
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 font-bold block mb-1">
                          Card Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="4111 2222 3333 4444"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            maxLength={19}
                            className="w-full bg-[#11131a] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-[#3399cc]/50 transition-colors"
                          />
                          {getCardBrandImg() && (
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-mono uppercase bg-neutral-900 border border-white/10 px-1.5 py-0.5 rounded text-neutral-300">
                              {getCardBrandImg()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 font-bold block mb-1">
                            Expiration Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            maxLength={5}
                            className="w-full bg-[#11131a] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-[#3399cc]/50 transition-colors text-center"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 font-bold block mb-1">
                            CVV / security card
                          </label>
                          <input
                            type="password"
                            placeholder="3-digit"
                            maxLength={3}
                            value={cardCvv}
                            onChange={handleCvvChange}
                            className="w-full bg-[#11131a] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-[#3399cc]/50 transition-colors text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 font-bold block mb-1">
                          Cardholder Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="MARCUS AURELIUS"
                          value={cardName}
                          onChange={(e) => { setCardName(e.target.value.toUpperCase()); setCardError(''); }}
                          className="w-full bg-[#11131a] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-[#3399cc]/50 transition-colors"
                        />
                      </div>
                    </div>

                    {cardError && (
                      <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[10px] bg-rose-950/25 border border-rose-500/10 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{cardError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. UPI / QR CODE TAB */}
                {activeTab === 'upi' && (
                  <div className="space-y-4">
                    <span className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">
                      Unified Payments Interface (UPI) secure channels
                    </span>

                    {!showQrCode ? (
                      <div className="space-y-4">
                        <div className="bg-[#11131a] border border-white/5 p-4 rounded-xl flex flex-col items-center text-center">
                          <QrCode className="w-10 h-10 text-neutral-500 mb-2" />
                          <h4 className="text-xs text-white/95 font-semibold">Instant UPI QR Code Generator</h4>
                          <p className="text-[10px] text-neutral-500 max-w-xs mt-1 font-sans">
                            Instant scan through GPay, PhonePe, Bhim, or Paytm. Securely synchronized.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowQrCode(true)}
                            className="mt-3.5 px-4 py-1.5 bg-[#3399cc]/10 hover:bg-[#3399cc]/20 border border-[#3399cc]/20 text-[#3399cc] rounded-lg text-[10px] font-mono tracking-wider uppercase font-bold transition-all cursor-pointer"
                          >
                            🚀 Generate Code for ₹{totalINR.toLocaleString('en-IN')}
                          </button>
                        </div>

                        <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-white/5"></div>
                          <span className="flex-shrink mx-3 text-[9px] font-bold text-neutral-600 font-mono">OR ENTER ADDRESS</span>
                          <div className="flex-grow border-t border-white/5"></div>
                        </div>

                        <div>
                          <label className="text-[9px] uppercase tracking-wider font-mono text-neutral-500 font-bold block mb-1">
                            UPI Virtual Payment ID
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="marcus@okhdfcbank"
                              value={upiId}
                              onChange={(e) => { setUpiId(e.target.value); setUpiError(''); }}
                              className="bg-[#11131a] border border-white/5 rounded-xl px-4 py-2 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-[#3399cc]/50 flex-1 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => { setUpiId('demo@upi'); setUpiError(''); }}
                              className="text-[9px] font-mono bg-white/2 hover:bg-white/5 border border-white/5 px-2.5 rounded-lg text-neutral-400 font-semibold cursor-pointer"
                            >
                              Fill Sample ID
                            </button>
                          </div>
                          {upiError && (
                            <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[9px] mt-2 bg-rose-950/25 border border-rose-500/10 p-2 rounded-lg">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{upiError}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#11131a] border border-white/5 p-4 rounded-xl flex flex-col items-center">
                        <div className="bg-white p-2.5 rounded-xl shadow-lg border border-[#3399cc]/20">
                          {/* Simulated stylized vector QR using micro layout */}
                          <div className="w-[124px] h-[124px] bg-neutral-100 flex flex-col items-center justify-center p-1 relative">
                            {/* Nested grids mimicking high fidelity QR mapping */}
                            <div className="w-full h-full border border-black/10 flex flex-wrap p-1 gap-1">
                              {/* Corner anchors */}
                              <div className="w-[30px] h-[30px] border-[5px] border-black shrink-0 relative bg-white flex items-center justify-center">
                                <div className="w-[10px] h-[10px] bg-black"></div>
                              </div>
                              <div className="flex-1"></div>
                              <div className="w-[30px] h-[30px] border-[5px] border-black shrink-0 relative bg-white flex items-center justify-center">
                                <div className="w-[10px] h-[10px] bg-black"></div>
                              </div>
                              <div className="w-full flex items-center justify-center">
                                <div className="bg-black w-4 h-4 rounded"></div>
                              </div>
                              <div className="w-[30px] h-[30px] border-[5px] border-black shrink-0 relative bg-white flex items-center justify-center animate-pulse">
                                <div className="w-[10px] h-[10px] bg-black"></div>
                              </div>
                              <div className="flex-1"></div>
                              <div className="w-[20px] h-[20px] bg-black shrink-0 flex items-center justify-center text-[7px] text-white font-mono font-extrabold">
                                R
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-center mt-3">
                          <p className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                            Scan with BHIM / GPay / Paytm
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Amount: <span className="text-[#3399cc] font-mono font-bold">₹{totalINR.toLocaleString('en-IN')}</span>
                          </p>
                          <div className="flex items-center justify-center gap-1.5 text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/10 mt-2 font-mono">
                            <Info className="w-3 h-3" />
                            <span>Expires in {formatTime(qrTimer)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 w-full mt-4">
                          <button
                            type="button"
                            onClick={() => setShowQrCode(false)}
                            className="flex-1 py-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 border border-white/5 rounded-lg text-[9px] font-mono text-neutral-400 cursor-pointer text-center"
                          >
                            Return to Selection
                          </button>
                          <button
                            type="button"
                            onClick={validateAndPay}
                            className="flex-1 py-1 px-2.5 bg-[#3399cc] hover:bg-[#2c84b0] rounded-lg text-[9px] font-mono text-white font-bold cursor-pointer text-center"
                          >
                            Simulate Scan Approved
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. NETBANKING TAB */}
                {activeTab === 'netbanking' && (
                  <div className="space-y-4">
                    <span className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">
                      Secure Retail Netbanking portals
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-left">
                      {[
                        { id: 'sbi', name: 'State Bank of India', code: 'SBI' },
                        { id: 'hdfc', name: 'HDFC Retail Bank', code: 'HDFC' },
                        { id: 'icici', name: 'ICICI Private Bank', code: 'ICICI' },
                        { id: 'axis', name: 'Axis Bank Network', code: 'AXIS' },
                        { id: 'kotak', name: 'Kotak Mahindra Block', code: 'KOTAK' },
                        { id: 'pnb', name: 'Punjab National Bank', code: 'PNB' }
                      ].map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setSelectedBank(bank.id)}
                          className={`p-3 rounded-xl border font-mono text-xs text-left transition-all flex items-center justify-between cursor-pointer ${
                            selectedBank === bank.id 
                              ? 'bg-[#3399cc]/10 border-[#3399cc] text-[#3399cc]' 
                              : 'bg-[#11131a] border-white/5 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-[10.5px] leading-tight">{bank.name}</p>
                            <span className="text-[8px] text-[#4e5a70]">Clearing Routing: {bank.code}</span>
                          </div>
                          {selectedBank === bank.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3399cc]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. WALLET DETAILED SELECTION */}
                {activeTab === 'wallet' && (
                  <div className="space-y-4">
                    <span className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">
                      Secure digital wallets
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-left">
                      {[
                        { id: 'paytm', name: 'Paytm Protected Wallet' },
                        { id: 'mobikwik', name: 'MobiKwik Postpaid Account' },
                        { id: 'phonepe', name: 'PhonePe Safe Wallet' },
                        { id: 'amazon', name: 'Amazon Pay Balance' }
                      ].map((wallet) => (
                        <button
                          key={wallet.id}
                          type="button"
                          onClick={() => setSelectedWallet(wallet.id)}
                          className={`p-3 rounded-xl border font-mono text-xs text-left transition-all flex items-center justify-between cursor-pointer ${
                            selectedWallet === wallet.id 
                              ? 'bg-[#3399cc]/10 border-[#3399cc] text-[#3399cc]' 
                              : 'bg-[#11131a] border-white/5 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-[10px] leading-tight">{wallet.name}</p>
                            <span className="text-[8px] text-[#4e5a70]">Instant Verification</span>
                          </div>
                          {selectedWallet === wallet.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3399cc]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Secure Footer and Checkout CTA */}
              {!showQrCode && (
                <div className="p-5 border-t border-white/5 bg-[#0a0c10] select-none shrink-0 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#4e5a70] text-[9px] font-mono leading-none">
                    <Lock className="w-3 h-3 text-[#3399cc] shrink-0" />
                    <span>Razorpay SSL 256-Bit • Direct Sync</span>
                  </div>

                  <button
                    type="button"
                    onClick={validateAndPay}
                    className="w-full sm:w-auto h-10 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    <span>Proceed to Pay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
