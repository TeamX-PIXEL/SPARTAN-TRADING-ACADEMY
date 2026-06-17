"use client";

import React, { useState, useEffect } from "react";
import { Product, ProductType, Course, Indicator, Bot, CartItem } from "@/types/portal";
import { useApp } from "@/portal/AppContext";
import { Clock, Play, ShoppingCart, Info, Check, Sparkles, Zap, Award } from "lucide-react";

interface ProductCardProps {
  product: Product;
  type: ProductType;
  purchased: boolean;
  onOpenDetails: (uuid: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, type, purchased, onOpenDetails }) => {
  const { addToCart, cart } = useApp();
  
  // Countdown Timer state
  const [countdownText, setCountdownText] = useState<string>('Loading schedule...');
  const [isLiveNow, setIsLiveNow] = useState<boolean>(false);

  // Parse course dynamic live scheduling
  useEffect(() => {
    if (type !== 'course') return;
    const course = product as Course;
    if (!course.scheduled_at) {
      setCountdownText('Not yet scheduled');
      return;
    }

    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(course.scheduled_at!).getTime();
      const durationMs = (course.estimated_duration || 120) * 60 * 1000;
      const endTime = startTime + durationMs;

      if (now < startTime) {
        // Starts in future
        const diff = startTime - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let text = 'Starts in ';
        if (days > 0) text += `${days}d `;
        if (hours > 0 || days > 0) text += `${hours}h `;
        text += `${minutes}m ${seconds}s`;
        
        setCountdownText(text);
        setIsLiveNow(false);
      } else if (now >= startTime && now <= endTime) {
        // Active session
        setCountdownText('Live Now!');
        setIsLiveNow(true);
      } else {
        // Ended
        setCountdownText('Recording Available');
        setIsLiveNow(false);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [product, type]);

  const handleCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: product.uuid,
      title: product.title,
      price: product.price,
      image: product.image,
      type: type,
    });
  };

  const isAlreadyInCart = cart.some(c => c.id === product.uuid);

  return (
    <div
      onClick={() => onOpenDetails(product.uuid)}
      className="group relative bg-[#12151c]/40 hover:bg-[#12151c]/90 border border-[#1e222b] hover:border-blue-500/25 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer flex flex-col flex-1 min-w-[280px]"
      id={`product-card-${product.uuid}`}
    >
      {/* Thumbnail Frame */}
      <div className="relative h-44 overflow-hidden bg-[#0c0d0f] shrink-0">
        <img
          src={product.image}
          alt={product.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d0f] to-transparent" />

        {/* Dynamic Category Overlay badge */}
        <span className="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-[#4e5a70] dark:text-neutral-300 border border-white/5 text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-md font-semibold select-none">
          {product.category}
        </span>

        {/* Live status badge tags */}
        {type === 'course' && (
          <div className="absolute top-4 right-4 countdown-wrapper select-none">
            {isLiveNow ? (
              <span className="flex items-center gap-1.5 bg-red-600 border border-red-500 text-white font-semibold font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md animate-pulse">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                Live Now
              </span>
            ) : (
              <span className="bg-neutral-900/90 backdrop-blur-md border border-[#2d3139] text-neutral-300 font-mono text-[9px] px-2.5 py-1 rounded-md">
                {countdownText.includes('Starts in') ? countdownText.replace('Starts in ', '') : countdownText}
              </span>
            )}
          </div>
        )}

        {/* Extra meta tags for indicator accuracies */}
        {type === 'indicator' && (product as Indicator).accuracy && (
          <div className="absolute top-4 right-4 bg-emerald-900/60 backdrop-blur-md border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md">
            Accuracy: {(product as Indicator).accuracy}
          </div>
        )}

        {/* Bot APYs */}
        {type === 'bot' && (product as Bot).apy && (
          <div className="absolute top-4 right-4 bg-blue-900/60 backdrop-blur-md border border-blue-500/30 text-blue-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>{(product as Bot).apy} APY</span>
          </div>
        )}
      </div>

      {/* Grid Details body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Title */}
          <h3 className="text-sm font-semibold tracking-wide text-white group-hover:text-blue-400 transition-colors leading-snug">
            {product.title}
          </h3>
          
          {/* Sub description */}
          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
            {product.description}
          </p>

          {type === 'course' && (
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[10px] tracking-wide font-mono uppercase select-none pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Includes 1 Year Discord Support</span>
            </div>
          )}
        </div>

        {/* Feature quick bullet tags */}
        <div className="flex flex-wrap gap-1.5">
          {product.features.slice(0, 2).map((feat, idx) => (
            <span
              key={`${feat}-${idx}`}
              className="text-[10px] text-neutral-500 border border-neutral-800/60 px-2 py-0.5 rounded bg-neutral-950/20 font-sans truncate max-w-[140px]"
            >
              {feat}
            </span>
          ))}
        </div>

        {/* Price & Primary CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1e222b] gap-2">
          {purchased ? (
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 select-none">
              <Check className="w-3.5 h-3.5" />
              <span>Activated inside Portal</span>
            </div>
          ) : (
            <div className="flex flex-col font-mono">
              <span className="text-[9px] text-[#4e5a70] uppercase tracking-widest font-bold">ONE-TIME LOCK</span>
              <span className="text-sm font-bold text-white">${product.price}</span>
            </div>
          )}

          {/* Card Button triggers */}
          <div className="flex items-center gap-1.5 shrink-0">
            {purchased ? (
              type === 'course' && isLiveNow ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenDetails(product.uuid); }}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 group/btn cursor-pointer transition-colors border border-red-500 shadow-md shadow-red-500/10"
                >
                  <Play className="w-3 h-3 text-white fill-white animate-pulse" />
                  <span>Join Live</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenDetails(product.uuid); }}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-mono text-[10px] rounded-lg transition-colors cursor-pointer"
                >
                  Manage
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleCartClick}
                disabled={isAlreadyInCart}
                className={`p-2 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                  isAlreadyInCart
                    ? 'border border-[#2d3139] bg-[#1a1e27] text-neutral-400 hover:text-neutral-300'
                    : 'border border-blue-600/30 bg-blue-600 hover:bg-blue-500 text-white hover:border-blue-400'
                }`}
                title={isAlreadyInCart ? 'In Cart' : 'Purchase Access Key'}
              >
                {isAlreadyInCart ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ShoppingCart className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProductCard;
