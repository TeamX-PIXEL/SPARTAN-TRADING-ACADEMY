"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Course } from '@/types/portal';
import { API } from '@/portal/api';
import { useApp } from '@/portal/AppContext';
import { ProductCard } from '@/components/portal/ProductCard';
import { BookOpen, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export const CoursesPage: React.FC = () => {
  const { purchasedIds } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [skip, setSkip] = useState<number>(0);
  const [limit] = useState<number>(2); // Fetch 2 items per chunk to demonstrate pagination!
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Initial list fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const res = await API.getCourses(0, limit);
        setCourses(res.items);
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

  // Infinite Scroll fetch execution
  const fetchMoreCourses = async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      // Extra artificial delay to allow skeleton screen presentation
      const res = await API.getCourses(skip, limit);
      setCourses(prev => {
        const existingUuids = new Set(prev.map(c => c.uuid));
        const newItems = res.items.filter(c => !existingUuids.has(c.uuid));
        return [...prev, ...newItems];
      });
      setSkip(prev => prev + limit);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Error fetching more courses:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Grid container scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (!gridContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = gridContainerRef.current;
      
      // If client is within 200px of scrolling bottom, fetch next page batch
      if (scrollHeight - scrollTop - clientHeight < 200) {
        fetchMoreCourses();
      }
    };

    const container = gridContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
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
      ref={gridContainerRef}
      className="flex-1 h-[calc(100vh-80px)] overflow-y-auto split-scroll p-6 md:p-8 space-y-8"
    >
      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e222b] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">MASTER ARCHIVE</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide leading-tight">
            Advanced Live Masterclasses
          </h2>
          <p className="text-xs text-neutral-400 max-w-xl">
            Acquire mathematical trading keys from former hedge fund risk analysts. Real-time broadcast access updates natively inside details panel.
          </p>
        </div>

        {/* Real-time system counter statistic */}
        <div className="bg-[#12151c]/60 border border-[#1e222b] px-4 py-2.5 rounded-xl flex items-center gap-3.5 shrink-0 self-start font-mono text-[11px] text-neutral-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Active Streams Today: <strong className="text-white">1 Scheduled</strong></span>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        /* Card skeleton display */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(n => (
            <div key={n} className="border border-neutral-800 rounded-2xl p-5 space-y-4 bg-neutral-900/40 animate-pulse">
              <div className="h-40 bg-neutral-800 rounded-xl" />
              <div className="h-4 bg-neutral-800 rounded w-1/3" />
              <div className="h-4 bg-neutral-800 rounded w-3/4" />
              <div className="h-3 bg-neutral-800 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <ProductCard
                key={course.uuid}
                product={course}
                type="course"
                purchased={purchasedIds.courses.includes(course.uuid)}
                onOpenDetails={openProduct}
              />
            ))}
          </div>

          {/* Lazy compilation / scroll progress feedback */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Fetching archived workshops from terminal database...</span>
            </div>
          )}

          {!hasMore && courses.length > 0 && (
            <div className="text-center py-8 border-t border-[#1e222b]/40 text-xs font-mono text-neutral-500">
              ● End of active Masterclass schedule registry ●
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default CoursesPage;
