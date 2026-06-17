"use client";

import React from "react";
import { AlertCircle, Search, HelpCircle } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'search' | 'alert' | 'help';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No matches located",
  description = "Refine search parameters or check spelling tags before trying again.",
  icon = 'search',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center select-none bg-[#12151c]/10 border border-dashed border-[#1e222b] rounded-2xl max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-[#12151c] border border-[#1e222b] flex items-center justify-center text-neutral-500 mb-4">
        {icon === 'search' ? (
          <Search className="w-5 h-5 text-neutral-400" />
        ) : icon === 'alert' ? (
          <AlertCircle className="w-5 h-5 text-rose-400" />
        ) : (
          <HelpCircle className="w-5 h-5 text-neutral-400" />
        )}
      </div>
      <h3 className="text-sm font-semibold tracking-wide text-white leading-normal">
        {title}
      </h3>
      <p className="text-xs text-neutral-500 mt-2 leading-relaxed max-w-sm">
        {description}
      </p>
    </div>
  );
};
export default EmptyState;
