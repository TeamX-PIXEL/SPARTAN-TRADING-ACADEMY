"use client";

import { Bot as BotIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface BotThumbProps {
  title: string;
  image?: string;
  category?: string;
  className?: string;
}

const GRADIENTS = [
  "from-cyan-500/20 to-sky-500/10 text-cyan-700 dark:text-cyan-300",
  "from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-300",
  "from-violet-500/20 to-fuchsia-500/10 text-violet-700 dark:text-violet-300",
  "from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300",
  "from-rose-500/20 to-pink-500/10 text-rose-700 dark:text-rose-300",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

export function BotThumb({ title, image, category, className }: BotThumbProps) {
  if (image) {
    return <img src={image} alt={title} className={cn("h-full w-full object-cover", className)} />;
  }
  const gradient = GRADIENTS[hash(title) % GRADIENTS.length];
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br",
        gradient,
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <BotIcon className="size-5 opacity-80" />
        {category && (
          <span className="text-[9px] font-medium uppercase tracking-wider opacity-70">{category}</span>
        )}
      </div>
    </div>
  );
}
