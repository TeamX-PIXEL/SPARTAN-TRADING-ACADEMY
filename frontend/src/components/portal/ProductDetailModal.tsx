"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useApp } from "@/portal/AppContext";
import { Course, Indicator, Bot, Product } from "@/types/portal";
import { API } from "@/portal/api";
import { X, ShoppingCart, Globe, Terminal, Cpu, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProductDetailModalProps {
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ onClose }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { cart, addToCart, purchasedIds, user } = useApp();
  
  const productId = searchParams.get('product');

  const [product, setProduct] = useState<Product | null>(null);
  const [productType, setProductType] = useState<'course' | 'indicator' | 'bot' | null>(null);
  const [isPurchased, setIsPurchased] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch product from backend using single-item endpoints
  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        // If purchased, we already know the type from purchasedIds
        if (purchasedIds.courses.includes(productId)) {
          const found = await API.getCourseById(productId);
          if (!cancelled && found) {
            setProduct(found);
            setProductType('course');
            setIsPurchased(true);
          }
        } else if (purchasedIds.indicators.includes(productId)) {
          const found = await API.getIndicatorById(productId);
          if (!cancelled && found) {
            setProduct(found);
            setProductType('indicator');
            setIsPurchased(true);
          }
        } else if (purchasedIds.bots.includes(productId)) {
          const found = await API.getBotById(productId);
          if (!cancelled && found) {
            setProduct(found);
            setProductType('bot');
            setIsPurchased(true);
          }
        } else {
          // Not purchased — try each endpoint sequentially
          const foundCourse = await API.getCourseById(productId);
          if (!cancelled && foundCourse) {
            setProduct(foundCourse);
            setProductType('course');
            setIsPurchased(false);
          } else if (!cancelled) {
            const foundInd = await API.getIndicatorById(productId);
            if (!cancelled && foundInd) {
              setProduct(foundInd);
              setProductType('indicator');
              setIsPurchased(false);
            } else if (!cancelled) {
              const foundBot = await API.getBotById(productId);
              if (!cancelled && foundBot) {
                setProduct(foundBot);
                setProductType('bot');
                setIsPurchased(false);
              } else {
                setProduct(null);
                setProductType(null);
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
        setProduct(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProduct();
    return () => { cancelled = true; };
  }, [productId, purchasedIds.courses, purchasedIds.indicators, purchasedIds.bots]);

  if (!productId || !product || !productType) return null;

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      type: productType,
    });
  };

  const isAlreadyInCart = cart.some(c => c.id === product.id);

  // Close modal by taking out "product" parameter
  const handleModalClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("product");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center select-none p-0 sm:p-4">
        {/* Backdrop overlay background screen with smooth Gaussian blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          exit={{ opacity: 0 }}
          onClick={handleModalClose}
          className="absolute inset-0 bg-[#060709] backdrop-blur-md cursor-pointer"
        />

        {/* Modal Surface Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative bg-[#0c0d0f] border border-[#1e222b] w-full h-full sm:h-[85vh] sm:max-h-[720px] sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-20"
        >
          {/* Header row elements */}
          <div className="h-16 border-b border-[#1e222b] px-6 flex items-center justify-between shrink-0 bg-[#0c0d0f]/50 backdrop-blur">
            <span className="text-[10px] font-mono tracking-widest text-[#4e5a70] uppercase">
              Terminal Node Detail — {productType} profile
            </span>
            <button
              type="button"
              onClick={handleModalClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Body Section with scroll controls */}
          <div className="flex-1 overflow-y-auto split-scroll">
            {isLoading ? (
              /* Simulated Skeleton loading screens */
              <div className="p-8 space-y-6">
                <div className="flex gap-6 items-start">
                  <div className="w-1/3 aspect-[4/3] rounded-xl bg-neutral-800 animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-neutral-800 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-neutral-800 rounded w-1/2 animate-pulse" />
                    <div className="h-3 bg-neutral-800 rounded w-5/6 animate-pulse" />
                  </div>
                </div>
                <div className="border border-neutral-800 rounded-xl p-5 space-y-3 animate-pulse">
                  <div className="h-4 bg-neutral-800 rounded w-1/4" />
                  <div className="h-3 bg-neutral-800 rounded w-full" />
                  <div className="h-3 bg-neutral-800 rounded w-5/6" />
                </div>
              </div>
            ) : (
              <div className="p-6 md:p-8 space-y-8 pb-20">
                {/* Hero / Meta Split */}
                <div className="flex flex-col md:flex-row gap-6 md:items-start">
                  <div className="w-full md:w-2/5 aspect-[4/3] rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shrink-0">
                    <img
                      src={product.image}
                      alt={product.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-blue-400 bg-blue-900/30 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        {product.category}
                      </span>
                      {productType === 'indicator' && (
                        <span className="text-[10px] tracking-wide font-semibold text-emerald-400 bg-emerald-990/20 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          {(product as Indicator).scriptType}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
                      {product.title}
                    </h2>
                    <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                      {product.longDescription}
                    </p>
                  </div>
                </div>

                {/* Specific Layout Details based on Purchase configurations */}
                {productType === 'course' && (
                  <>
                    {/* Course details widgets */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono select-none">
                        <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl">
                          <span className="text-[9px] text-[#4e5a70] uppercase">Lecturer / Lead</span>
                          <p className="text-xs text-white mt-1">{(product as Course).lecturer}</p>
                        </div>
                        <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl">
                          <span className="text-[9px] text-[#4e5a70] uppercase">Duration</span>
                          <p className="text-xs text-white mt-1">{(product as Course).duration}</p>
                        </div>
                        <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl">
                          <span className="text-[9px] text-[#4e5a70] uppercase">Difficulty Level</span>
                          <p className="text-xs text-white mt-1 text-blue-400">{(product as Course).difficulty}</p>
                        </div>
                      </div>

                      <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl font-mono select-none">
                        <span className="text-[9px] text-[#4e5a70] uppercase">Start Date & Time</span>
                        <p className="text-xs text-emerald-400 mt-1 font-semibold">
                          {(product as Course).scheduled_at ? new Date((product as Course).scheduled_at!).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Not Scheduled'}
                        </p>
                      </div>

                      {/* Premium 1 Year Free Discord Support Banner */}
                      <div className="relative bg-indigo-950/25 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3.5 shadow-lg shadow-indigo-500/5 select-none overflow-hidden">
                        {/* Interactive background accent glow */}
                        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="bg-indigo-900/45 border border-indigo-500/30 text-indigo-400 p-2 rounded-lg mt-0.5 shrink-0 flex items-center justify-center">
                          <svg className="w-4 h-4 fill-indigo-400" viewBox="0 0 127.14 96.36" aria-hidden="true">
                            <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.8.69,1.63,1.38,2.51,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.58-18.83C129.24,47.88,123.36,25,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] text-indigo-400 font-mono uppercase font-bold tracking-widest bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/15">
                              PREMIUM COURSE ADD-ON
                            </span>
                            <span className="text-[8px] bg-indigo-500 text-white font-mono font-bold tracking-wider px-1.5 py-0.5 rounded uppercase">
                              1 Year Free
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-white tracking-wide">
                            Direct Discord Support Portal
                          </h4>
                          <p className="text-[11px] text-neutral-400 leading-relaxed max-w-lg font-sans">
                            Get full access to the private course lounge, automated setup checkups, immediate instructor Q&A, and live community alerts. Your master invitation token auto-generates immediately upon product activation.
                          </p>
                        </div>
                      </div>
                    </div>

                  </>
                )}

                {productType === 'indicator' && (
                  <>
                    {/* Indicator dynamic metrics */}
                    <div className="grid grid-cols-2 gap-4 font-mono select-none">
                      <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-blue-400" />
                        <div>
                          <span className="text-[9px] text-[#4e5a70] uppercase">Script Target</span>
                          <p className="text-xs text-neutral-200 font-semibold mt-0.5">{(product as Indicator).scriptType}</p>
                        </div>
                      </div>
                      <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl flex items-center gap-3">
                        <Cpu className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="text-[9px] text-[#4e5a70] uppercase">Recommended Bar</span>
                          <p className="text-xs text-neutral-200 font-semibold mt-0.5">{(product as Indicator).timeframe}</p>
                        </div>
                      </div>
                    </div>


                  </>
                )}

                {productType === 'bot' && (
                  <>
                    {/* Bot detailed metrics */}
                    <div className="grid grid-cols-2 gap-4 font-mono select-none">
                      <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl flex items-center gap-3">
                        <Globe className="w-5 h-5 text-blue-400" />
                        <div>
                          <span className="text-[9px] text-[#4e5a70] uppercase">Target Exchange</span>
                          <p className="text-xs text-neutral-200 font-semibold mt-0.5">{(product as Bot).exchange}</p>
                        </div>
                      </div>
                      <div className="bg-[#12151c]/60 border border-[#1e222b] p-3 rounded-xl flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        <div>
                          <span className="text-[9px] text-[#4e5a70] uppercase">Historical Return APY</span>
                          <p className="text-xs text-neutral-200 font-semibold mt-0.5 text-blue-400">{(product as Bot).apy}</p>
                        </div>
                      </div>
                    </div>

                    {/* Webhook and Secret Lock section removed for bots */}
                  </>
                )}

                {/* Features List Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#4e5a70]">
                    Inclusions & Functionality Items
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {product.features.slice(0, 4).map((feat, idx) => (
                      <li
                        key={`${feat}-${idx}`}
                        className="flex items-start gap-2.5 text-xs text-neutral-300 font-sans"
                      >
                        <span className="bg-blue-900/20 border border-blue-500/20 text-blue-400 p-0.5 rounded mt-0.5">
                          <Check className="w-3 h-3" />
                        </span>
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Persistent FAB/Bottom Bar aligned relative to purchase status */}
          <div className="h-16 border-t border-[#1e222b] px-6 flex items-center justify-between shrink-0 bg-[#090b0e] z-10 sticky bottom-0">
            {isPurchased ? (
              <div className="flex w-full items-center justify-between font-mono">
                <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  <Check className="w-3.5 h-3.5" />
                  <span>Licensed Access Secured</span>
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-col font-mono">
                  <span className="text-[9px] text-[#4e5a70] uppercase font-bold tracking-widest">ONE TIME FEE</span>
                  <span className="text-base font-black text-white">₹{product.price}</span>
                </div>

                <button
                  type="button"
                  disabled={isAlreadyInCart}
                  onClick={handleAddToCart}
                  className={`h-10 px-5 rounded-xl border font-bold text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-98 ${
                    isAlreadyInCart
                      ? 'border-[#1e222b] bg-[#12151c] text-neutral-400'
                      : 'border-blue-600/30 bg-blue-600 hover:bg-blue-500 text-white hover:border-blue-400 shadow-lg shadow-blue-500/10'
                  }`}
                >
                  {isAlreadyInCart ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Item in Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default ProductDetailModal;
