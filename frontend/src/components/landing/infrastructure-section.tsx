"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, TrendingUp, Shield } from "lucide-react";

const indicators = [
  {
    name: "Evergreen",
    icon: TrendingUp,
    description: "Our latest indicator built for modern market conditions. Clean signals with minimal lag.",
    features: [
      "Real-time entry & exit signals",
      "Order block detection",
      "SMT Divergence",
      "Multi-timeframe analysis",
      "57 Symbols for optimized",
      "Real-time inbuilt alerts",
    ],
    pricing: "₹2,999",
    badge: "New",
  },
  {
    name: "Legacy",
    icon: Shield,
    description: "Our proven classic indicator. Trusted by thousands of traders since 2021.",
    features: [
      "Real-time entry & exit signals",
      "Order block detection",
      "Candlestick Rejection (First Class)",
      "Support all symbols & timeframes",
      "Highly optimized Entry models",
      "Real-time inbuilt alerts",
    ],
    pricing: "₹3,999",
    badge: "Classic",
  },
];

const comparisonRows = [
  { feature: "Entry/Exit Signals", evergreen: true, legacy: true },
  { feature: "Order Block Detection", evergreen: true, legacy: true },
  { feature: "SMT Divergence", evergreen: true, legacy: true },
  { feature: "Multi-Timeframe", evergreen: true, legacy: true },
  { feature: "CR First Class Confirmation", evergreen: false, legacy: true },
  { feature: "All symbols & timeframes", evergreen: false, legacy: true },
  { feature: "Real-time inbuilt alerts", evergreen: true, legacy: true },
  { feature: "Re-Entry Opportunities", evergreen: true, legacy: false },
];

export function IndicatorsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  return (
    <section id="indicators" ref={sectionRef} className="relative py-32 lg:py-40">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
              <span className="w-12 h-px bg-foreground/30" />
              TradingView Indicators
            </span>
            <h2
              className={`text-6xl md:text-7xl lg:text-8xl font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Premium
              <br />
              <span className="text-stroke text-[#3b82f6]">indicators.</span>
            </h2>
          </div>

          <div className="lg:col-span-5 flex items-end">
            <p
              className={`text-lg text-muted-foreground transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Two powerful TradingView indicators designed for Indian markets. Choose one or get both.
            </p>
          </div>
        </div>

        {/* Graph image */}
        <div className={`w-full mb-20 transition-all duration-1000 delay-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          <img
            src="/images/real-time-graph.png"
            alt=""
            aria-hidden="true"
            className="w-full h-auto object-cover"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {indicators.map((indicator, index) => (
            <div
              key={indicator.name}
              className={`group relative bg-card border border-foreground/10 p-8 lg:p-10 transition-all duration-700 hover:border-foreground/30 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <span className="px-3 py-1 border border-foreground/20 text-xs font-mono">{indicator.badge}</span>
              </div>

              <indicator.icon className="w-10 h-10 text-[#3b82f6] mb-6" />

              <h3 className="text-3xl font-display mb-4">{indicator.name}</h3>
              <p className="text-muted-foreground mb-8">{indicator.description}</p>

              <ul className="space-y-3 mb-8">
                {indicator.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6] shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-8 pb-8 border-b border-foreground/10">
                <div>
                  <span className="text-xs font-mono text-muted-foreground">Monthly</span>
                  <div className="text-3xl font-display">{indicator.pricing}</div>
                </div>
              </div>

              <a
                href="#"
                className="w-full py-4 flex items-center justify-center gap-2 text-sm font-medium border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5 transition-all"
              >
                Get {indicator.name}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>

        <div
          className={`transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h3 className="text-2xl font-display mb-8 text-center">Feature Comparison</h3>
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-foreground/20">
              <span className="text-sm font-mono text-muted-foreground">Feature</span>
              <span className="text-sm font-display text-center">Evergreen</span>
              <span className="text-sm font-display text-center">Legacy</span>
            </div>
            {comparisonRows.map((row) => (
              <div key={row.feature} className="grid grid-cols-3 gap-4 py-4 border-b border-foreground/10">
                <span className="text-sm text-muted-foreground">{row.feature}</span>
                <div className="flex justify-center">
                  {row.evergreen ? (
                    <Check className="w-5 h-5 text-[#3b82f6]" />
                  ) : (
                    <span className="text-muted-foreground/30">&mdash;</span>
                  )}
                </div>
                <div className="flex justify-center">
                  {row.legacy ? (
                    <Check className="w-5 h-5 text-[#3b82f6]" />
                  ) : (
                    <span className="text-muted-foreground/30">&mdash;</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View setup guide & documentation
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
