"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Indicator } from '@/types/portal';
import { API } from '@/portal/api';
import { useApp } from '@/portal/AppContext';
import { ProductCard } from '@/components/portal/ProductCard';
import { LineChart, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export const IndicatorsPage: React.FC = () => {
  const { purchasedIds } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
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
        const res = await API.getIndicators(0, limit);
        setIndicators(res.items);
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

  const fetchMoreIndicators = async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const res = await API.getIndicators(skip, limit);
      setIndicators(prev => {
        const existingUuids = new Set(prev.map(i => i.uuid));
        const newItems = res.items.filter(i => !existingUuids.has(i.uuid));
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
        fetchMoreIndicators();
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

  const openProduct = (uuid: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('product', uuid);
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
            <LineChart className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase font-semibold">INDICATOR MODULES</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight">
            Institutional Technical indicators
          </h2>
          <p className="text-xs text-neutral-400 max-w-xl">
            Plug direct dark pool feeds and resting institutional liquidity targets directly into your personal TradingView panels. Fully optimized to support Pine Script v5 syntax.
          </p>
        </div>

        {/* Real-time system counter statistic */}
        <div className="bg-[#12151c]/60 border border-[#1e222b] px-4 py-2.5 rounded-xl flex items-center gap-3.5 shrink-0 self-start font-mono text-[11px] text-neutral-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span>Active Licenses: <strong className="text-white">Pine Script v5 Synced</strong></span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {indicators.map((ind) => (
              <ProductCard
                key={ind.uuid}
                product={ind}
                type="indicator"
                purchased={purchasedIds.indicators.includes(ind.uuid)}
                onOpenDetails={openProduct}
              />
            ))}
          </div>

          {isLoadingMore && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Checking indicators folder database...</span>
            </div>
          )}

          {!hasMore && indicators.length > 0 && (
            <div className="text-center py-8 border-t border-[#1e222b]/40 text-xs font-mono text-neutral-500">
              ● All active indicator profiles listed ●
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default IndicatorsPage;
