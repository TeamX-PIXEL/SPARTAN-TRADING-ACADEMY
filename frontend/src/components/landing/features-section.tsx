"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

const features = [
  {
    number: "01",
    title: "Monthly Courses",
    subtitle: "learn & grow",
    description: "Live batch every month with Smart Money Concepts, Nifty & Bank Nifty analysis. Tamil & English sessions with recordings and Discord access.",
    stats: { value: "15K+", label: "students enrolled" },
  },
  {
    number: "02",
    title: "TradingView Indicators",
    subtitle: "evergreen & legacy",
    description: "Two premium indicators — Evergreen and Legacy. Built for Indian markets with entry/exit signals, order blocks, and smart money zones.",
    stats: { value: "2", label: "premium indicators" },
  },
  {
    number: "03",
    title: "Telegram Bot Alerts",
    subtitle: "real-time signals",
    description: "Two automated Telegram bots sending live trade signals directly to your phone. Powered by our indicators, delivered in real-time.",
    stats: { value: "24/7", label: "market monitoring" },
  },
];

export function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-[oklch(0.09_0.01_260)] text-white overflow-hidden"
    >
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-white/[0.02] blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header — title + tree image */}
        <div className="relative mb-0 lg:mb-0 grid lg:grid-cols-2 gap-4 lg:gap-12 items-end">
          <div className="overflow-hidden pb-0 lg:pb-32">
            <div className={`transition-all duration-1000 ${isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"}`}>
              <span className="inline-flex items-center gap-3 text-sm font-mono text-white/40 mb-8">
                <span className="w-12 h-px bg-foreground/30" />

                What We Offer
              </span>
            </div>

            <h2 className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.85] transition-all duration-1000 delay-100 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
            }`}>
              <span className="block">Everything</span>
              <span className="block text-white/50">you need</span>
              <span className="block text-[#3b82f6]/40">to trade smart.</span>
            </h2>
          </div>

          {/* Tree image */}
          <div className={`relative h-[320px] lg:h-[640px] overflow-hidden transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}>
            <img
              src="/images/tree.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.09_0.01_260)] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <button
              key={feature.number}
              type="button"
              onClick={() => setActiveFeature(index)}
              className={`relative text-left p-8 lg:p-12 border transition-all duration-500 ${
                activeFeature === index
                  ? "bg-[#000000] border-[#95c0f5]"
                  : "bg-[#000000] border-white/25 hover:border-white/50"
              }`}
            >
              {/* Step number with animated line */}
              <div className="flex items-center gap-4 mb-8">
                <span className={`text-4xl font-display transition-colors duration-300 ${
                  activeFeature === index ? "text-[#3b82f6]" : "text-white/20"
                }`}>
                  {feature.number}
                </span>
                <div className="flex-1 h-px bg-white/10 overflow-hidden">
                  {activeFeature === index && (
                    <div className="h-full bg-[#3b82f6]/50 animate-progress" />
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-3xl lg:text-4xl font-display mb-2">
                {feature.title}
              </h3>
              <span className="text-xl text-white/40 font-display block mb-6">
                {feature.subtitle}
              </span>

              {/* Description */}
              <p className={`text-white/60 leading-relaxed transition-opacity duration-300 ${
                activeFeature === index ? "opacity-100" : "opacity-60"
              }`}>
                {feature.description}
              </p>

              {/* Stats */}
              <div className="mt-8">
                <span className="text-3xl font-display text-[#3b82f6]">{feature.stats.value}</span>
                <span className="block text-xs text-white/40 font-mono mt-1">{feature.stats.label}</span>
              </div>

              {/* Active indicator */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-[#6babfa] transition-transform duration-500 origin-left ${
                activeFeature === index ? "scale-x-100" : "scale-x-0"
              }`} />
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress 6s linear forwards;
        }
      `}</style>
    </section>
  );
}
