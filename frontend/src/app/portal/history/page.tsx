"use client";

import React, { useState, useEffect } from 'react';
import { useApp } from '@/portal/AppContext';
import { API } from '@/portal/api';
import { Transaction } from '@/types/portal';
import { 
  CreditCard, 
  Search, 
  Download, 
  HelpCircle, 
  RefreshCw, 
  ShieldCheck, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  Receipt,
  LayoutGrid,
  BookOpen,
  LineChart,
  Zap
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { user, addToast } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'courses' | 'indicators' | 'bots'>('all');
  
  // Pagination State Controls
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4; // Show 4 secure receipts per page to demonstrate pagination

  // Reset page position to page 1 upon query search or tab toggle to prevent overflow bounds
  useEffect(() => {
    setCurrentPage(1);
  }, [historySearch, activeCategory]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const txs = await API.getTransactions();
      setTransactions(txs);
    } catch (err) {
      console.error(err);
      addToast("Failed to fetch detailed billing logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  // Mock receipt download simulation
  const handleDownloadInvoice = (txId: string) => {
    addToast(`Constructing digital invoice PDF for transaction ${txId}...`, "info");
    setTimeout(() => {
        addToast(`Invoice downloaded successfully!`, "success");
    }, 1200);
  };

  // Classify each transaction based on product_section from backend
  const getTransactionCategory = (tx: Transaction) => {
    if (tx.product_section === "Course") return "courses";
    if (tx.product_section === "Indicator") return "indicators";
    if (tx.product_section === "Bot") return "bots";

    // Fallback: use product_id prefix
    const id = tx.product_id || "";
    if (id.startsWith("CRS") || id.startsWith("course")) return "courses";
    if (id.startsWith("IND") || id.startsWith("indicator")) return "indicators";
    if (id.startsWith("BOT") || id.startsWith("bot")) return "bots";

    return "courses";
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    // 1. Search filter
    const matchesSearch = tx.productTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
                          tx.id.toLowerCase().includes(historySearch.toLowerCase()) ||
                          tx.type.toLowerCase().includes(historySearch.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Category filter
    if (activeCategory === 'all') return true;
    return getTransactionCategory(tx) === activeCategory;
  });

  const totalSpent = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  const coursesCount = transactions.filter(tx => getTransactionCategory(tx) === 'courses').length;
  const indicatorsCount = transactions.filter(tx => getTransactionCategory(tx) === 'indicators').length;
  const botsCount = transactions.filter(tx => getTransactionCategory(tx) === 'bots').length;

  // Pagination metrics
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pagedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 h-[calc(100vh-80px)] overflow-y-auto split-scroll p-6 md:p-8 space-y-8 bg-[#07080a] scroll-smooth">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#1e222b] pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">System Ledger</span>
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-white">
            Payment & Billing History
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Audit logs for invoice payments, license renewals, and checkout orders.
          </p>
        </div>

        {/* Sync Status Button */}
        <button
          type="button"
          onClick={fetchTransactions}
          className="px-4 py-2 bg-[#12151c]/60 border border-[#1e222b] text-[#4e5a70] hover:text-white hover:border-neutral-700 hover:bg-[#12151c] rounded-xl text-xs font-semibold font-mono tracking-wide transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Sync Records</span>
        </button>
      </div>

      {/* Aggregate Overview Metrics Row */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300 pointer-events-none transform-gpu" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 block">Total Account Outlay</span>
            <span className="text-2xl font-black font-mono text-white mt-2 block">₹{totalSpent.toLocaleString('en-IN')} <span className="text-xs text-neutral-400 font-normal">INR</span></span>
            <span className="text-[10px] text-neutral-500 mt-2 block font-mono">Synchronized terminal charges</span>
          </div>

          <div className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300 pointer-events-none transform-gpu" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 block">Logged Orders</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-2 block">{transactions.length} <span className="text-xs text-neutral-400 font-normal">receipts</span></span>
            <span className="text-[10px] text-emerald-500 mt-2 block font-mono font-bold">100% SUCCESS RATE</span>
          </div>

          <div className="bg-[#0c0d10] border border-[#1e222b] rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300 pointer-events-none transform-gpu" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-500 block">Active Gateway</span>
            <span className="text-sm text-white/90 mt-3 flex items-center gap-1.5 font-bold">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Razorpay Secure Terminal</span>
            </span>
            <span className="text-[10px] text-neutral-500 mt-4.5 block font-mono">PCI-DSS Compliant</span>
          </div>
        </div>
      )}

      {/* Main Billing Table/Card Panel */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e222b]/40 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Payment & Billing Logs</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Refined audit receipts for your course enrollments and active license subscriptions.
            </p>
          </div>
          
          {/* Search bar specifically for billing */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute top-3 left-3" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by ID or product..."
              className="w-full bg-[#12151c] border border-[#1e222b] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 font-mono"
            />
          </div>
        </div>

        {/* Category Filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c0d10]/50 border border-[#1e222b]/40 rounded-xl p-3.5" id="billing-category-filters">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-500">
              Filter Category:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ALL */}
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                activeCategory === 'all'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-extrabold'
                  : 'bg-[#12151c]/60 border-[#1e222b] text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All ({transactions.length})</span>
            </button>

            {/* Courses */}
            <button
              type="button"
              onClick={() => setActiveCategory('courses')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                activeCategory === 'courses'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-extrabold'
                  : 'bg-[#12151c]/60 border-[#1e222b] text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Courses ({coursesCount})</span>
            </button>

            {/* Indicators */}
            <button
              type="button"
              onClick={() => setActiveCategory('indicators')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                activeCategory === 'indicators'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-extrabold'
                  : 'bg-[#12151c]/60 border-[#1e222b] text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Indicators ({indicatorsCount})</span>
            </button>

            {/* Bots */}
            <button
              type="button"
              onClick={() => setActiveCategory('bots')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                activeCategory === 'bots'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-extrabold'
                  : 'bg-[#12151c]/60 border-[#1e222b] text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Bots ({botsCount})</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            <p className="text-xs text-neutral-500 mt-4 font-mono">Retrieving secure transaction tokens...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16 bg-[#12151c]/10 border border-dashed border-[#1e222b] rounded-2xl max-w-lg mx-auto p-6 space-y-4">
            <HelpCircle className="w-10 h-10 text-neutral-600 mx-auto" />
            <div>
              <h3 className="text-sm font-semibold text-white">No Billing Actions Logged</h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                Could not find any transaction entries matching your keyword search query. Try typing another criteria.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {pagedTransactions.map((tx, index) => {
                const cat = getTransactionCategory(tx);
                const categoryLabel = cat === 'courses' ? 'Course' : cat === 'indicators' ? 'Indicator' : 'Bot';
                return (
                  <div 
                    key={`${tx.id}-${index}`} 
                    className="bg-[#0c0d10] border border-[#1e222b] rounded-xl p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-[#12151c]/30 hover:border-[#2a2e3a]"
                  >
                    <div className="flex items-center gap-3.5">
                      <img 
                        src={tx.productImage || "https://picsum.photos/seed/default/600/400"} 
                        alt={tx.productTitle} 
                        className="w-12 h-12 rounded-lg object-cover border border-[#1e222b] flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            #{tx.id}
                          </span>
                          <span className={`text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 rounded ${
                            tx.type === 'Renewal' ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/20' : 'bg-blue-950 text-blue-400 border border-blue-500/20'
                          }`}>
                            {tx.type} • {categoryLabel}
                          </span>
                        </div>
                        <h4 className="text-[13px] font-semibold text-white tracking-wide mt-1">
                          {tx.productTitle}
                        </h4>
                        <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                          {categoryLabel === 'Indicator' ? (
                            <>TVID: <span className="text-neutral-400">{tx.tvid}</span></>
                          ) : categoryLabel === 'Bot' ? (
                            <>Telegram: <span className="text-neutral-400">{user?.telegram_user_id || "Not Configured"}</span></>
                          ) : (
                            <>Email: <span className="text-neutral-400">{user?.email || "Not Configured"}</span></>
                          )} • {new Date(tx.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Price and Action details Column */}
                    <div className="w-full md:w-auto flex md:flex-col justify-between md:items-end items-center gap-2 pt-3 md:pt-0 border-t md:border-none border-[#1e222b]/50">
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block">Amount Charged</span>
                        <span className="text-base font-black font-mono text-white">₹{tx.amount} <span className="text-[10px] font-normal text-neutral-400 font-sans">INR</span></span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold tracking-wider rounded uppercase">
                          {tx.status}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(tx.id)}
                          className="p-1.5 bg-[#12151c] hover:bg-[#1e222b] border border-[#1e222b] rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                          title="Download PDF Invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Receipt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls, Next Nav or Pager Section */}
            {totalPages > 1 && (
              <div 
                id="billing-pagination-controls" 
                className="bg-[#0c0d10] border border-[#1e222b] rounded-xl p-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs"
              >
                {/* Meta details */}
                <div className="text-neutral-400 text-[11px] font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>
                    Pagination Controls: Showing <span className="text-[#38bdf8] font-bold">{startIndex + 1}-{endIndex}</span> of <span className="text-white font-bold">{totalItems}</span> invoices
                  </span>
                </div>

                {/* Navigation Buttons Pager */}
                <div className="flex items-center gap-1.5" id="history-payments-pager">
                  {/* Clear / Reset to First Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                      currentPage === 1
                        ? 'border-neutral-800/60 bg-[#12151c]/20 text-neutral-600 cursor-not-allowed'
                        : 'border-[#1e222b] bg-[#12151c] hover:bg-[#1e222b] text-neutral-300 hover:text-white'
                    }`}
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Previous / Back */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg border transition-all flex items-center gap-1 text-[11px] cursor-pointer ${
                      currentPage === 1
                        ? 'border-neutral-800/60 bg-[#12151c]/20 text-neutral-600 cursor-not-allowed'
                        : 'border-[#1e222b] bg-[#12151c] hover:bg-[#1e222b] text-neutral-300 hover:text-white'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  {/* Numbered lists / Page Buttons */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20 font-black'
                            : 'border-[#1e222b] bg-[#12151c] hover:bg-[#1e222b] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  {/* Text labels: "Next Page" / "Forward" / "Continue" */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3.5 py-2 rounded-lg border transition-all flex items-center gap-1.5 font-bold text-[11px] cursor-pointer ${
                      currentPage === totalPages
                        ? 'border-neutral-800/60 bg-[#12151c]/20 text-neutral-600 cursor-not-allowed'
                        : 'border-blue-500/30 bg-blue-900/10 hover:bg-blue-900/30 text-blue-400 hover:text-blue-300 shadow-md shadow-blue-950/20'
                    }`}
                  >
                    <span>Next Page</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Forward to End */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                      currentPage === totalPages
                        ? 'border-neutral-800/60 bg-[#12151c]/20 text-neutral-600 cursor-not-allowed'
                        : 'border-[#1e222b] bg-[#12151c] hover:bg-[#1e222b] text-neutral-300 hover:text-white'
                    }`}
                    title="Last Page (Forward)"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helpful Warning Alert info box */}
      <div className="bg-[#12151c]/40 border border-[#1e222b] rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-neutral-400">
        <Receipt className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-200">Terminal Invoicing & Payment Disclaimers:</span>
          <p className="mt-1">
            Charges appear on your statement secured under DealDeck trading solutions. If you initiated license renewals or masterclass subscriptions and do not see the product unlock within 5 minutes, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
