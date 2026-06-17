"use client";

import React, { useState, useEffect } from "react";
import { Course, Indicator, Bot } from "@/types/portal";
import { API } from "@/portal/api";
import { useApp } from "@/portal/AppContext";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./EmptyState";
import { Loader2, Search } from "lucide-react";

interface SearchResultsProps {
  query: string;
  onOpenProduct: (uuid: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query, onOpenProduct }) => {
  const { purchasedIds } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const performSearch = async () => {
      try {
        setIsLoading(true);
        const results = await API.searchCatalog(query);
        setCourses(results.courses);
        setIndicators(results.indicators);
        setBots(results.bots);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (query.trim() !== "") {
      const db = setTimeout(performSearch, 300); // Debounce input searches
      return () => clearTimeout(db);
    }
  }, [query]);

  const hasAnyResults = courses.length > 0 || indicators.length > 0 || bots.length > 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 select-none gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Scanning Catalog Indexes...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 h-[calc(100vh-80px)] overflow-y-auto split-scroll p-6 md:p-8 space-y-10 select-none">
      {/* Title result header */}
      <div className="border-b border-[#1e222b] pb-6">
        <div className="flex items-center gap-2 text-blue-400">
          <Search className="w-5 h-5 text-blue-400" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">Cross-Section Search</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide mt-1">
          Catalog results for "{query}"
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Matched items located across entire masterclass catalog, indicators scripts, and grid execution bots.
        </p>
      </div>

      {!hasAnyResults ? (
        <EmptyState
          title={`No matches located for "${query}"`}
          description="Try checking your keywords spelling, using broader terms, or visiting different sections."
          icon="search"
        />
      ) : (
        <div className="space-y-10 pb-12">
          {/* Course Category */}
          {courses.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4e5a70] border-b border-[#1e222b]/50 pb-2">
                Live Masterclasses ({courses.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(course => (
                  <ProductCard
                    key={course.uuid}
                    product={course}
                    type="course"
                    purchased={purchasedIds.courses.includes(course.uuid)}
                    onOpenDetails={onOpenProduct}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Indicators Category */}
          {indicators.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4e5a70] border-b border-[#1e222b]/50 pb-2">
                Indicator Scripts ({indicators.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {indicators.map(ind => (
                  <ProductCard
                    key={ind.uuid}
                    product={ind}
                    type="indicator"
                    purchased={purchasedIds.indicators.includes(ind.uuid)}
                    onOpenDetails={onOpenProduct}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bots Category */}
          {bots.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#4e5a70] border-b border-[#1e222b]/50 pb-2">
                Systematic Bots ({bots.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bots.map(bot => (
                  <ProductCard
                    key={bot.uuid}
                    product={bot}
                    type="bot"
                    purchased={purchasedIds.bots.includes(bot.uuid)}
                    onOpenDetails={onOpenProduct}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default SearchResults;
