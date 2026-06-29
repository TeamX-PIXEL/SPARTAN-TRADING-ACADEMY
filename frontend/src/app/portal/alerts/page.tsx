"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bot } from '@/types/portal';
import { API } from '@/portal/api';
import { useApp } from '@/portal/AppContext';
import { ProductCard } from '@/components/portal/ProductCard';
import { Zap, ShieldCheck, Terminal, Loader2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export const AlertsPage: React.FC = () => {
  const { purchasedIds } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [bots, setBots] = useState<Bot[]>([]);
  const [skip, setSkip] = useState<number>(0);
  const [limit] = useState<number>(2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const res = await API.getBots(0, limit);
        setBots(res.items);
        setSkip(limit);
        setHasMore(res.hasMore);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [limit]);

  const fetchMoreBots = async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const res = await API.getBots(skip, limit);
      setBots(prev => {
        const existingIds = new Set(prev.map(b => b.id));
        const newItems = res.items.filter(b => !existingIds.has(b.id));
        return [...prev, ...newItems];
      });
      setSkip(prev => prev + limit);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        fetchMoreBots();
      }
    };

    const element = scrollContainerRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (element) {
        element.removeEventListener('scroll', handleScroll);
      }
    };
  }, [skip, hasMore, isLoadingMore]);

  const openProduct = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('product', id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 h-[calc(100vh-80px)] overflow-y-auto split-scroll p-6 md:p-8 space-y-8"
    >
      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e222b] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400">
            <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">AUTOMATED ALERTS & BOTS</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight">
            High-Frequency Automated Bots
          </h2>
          <p className="text-xs text-neutral-400 max-w-xl">
            Spin up remote server-side grid models. Synchronize webhook addresses to live indicators so trades automatically scale out inside channels.
          </p>
        </div>

        {/* Real-time system counter statistic */}
        <div className="bg-[#12151c]/60 border border-[#1e222b] px-4 py-2.5 rounded-xl flex items-center gap-3.5 shrink-0 self-start font-mono text-[11px] text-neutral-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Remote Servers Status: <strong className="text-emerald-400">ALL ONLINE</strong></span>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(n => (
            <div key={n} className="border border-neutral-800 rounded-2xl p-5 space-y-4 bg-neutral-900/40 animate-pulse">
              <div className="h-40 bg-neutral-800 rounded-xl" />
              <div className="h-4 bg-neutral-800 rounded w-1/4" />
              <div className="h-4 bg-neutral-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {bots.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#1e222b] rounded-2xl max-w-lg mx-auto">
              <Zap className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-white">No Bots Available</h3>
              <p className="text-xs text-neutral-500 mt-2 max-w-sm mx-auto leading-relaxed">
                There are currently no automated bots running. Check back soon — new bots are deployed regularly.
              </p>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bots.map((bot) => (
              <ProductCard
                key={bot.id}
                product={bot}
                type="bot"
                purchased={purchasedIds.bots.includes(bot.id)}
                onOpenDetails={openProduct}
              />
            ))}
          </div>

          {isLoadingMore && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Checking cloud grid registry...</span>
            </div>
          )}

          {!hasMore && bots.length > 0 && (
            <div className="text-center py-8 border-t border-[#1e222b]/40 text-xs font-mono text-neutral-500">
              ● Server-side grid models synchronized perfectly ●
            </div>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
};
export default AlertsPage;
