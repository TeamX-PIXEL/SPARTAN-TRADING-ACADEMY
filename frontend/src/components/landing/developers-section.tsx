"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Video, MessageSquare, BarChart3 } from "lucide-react";

const stats = [
  { icon: Video, value: "50K+", label: "YouTube Subscribers" },
  { icon: BarChart3, value: "5.1K", label: "TradingView Followers" },
  { icon: MessageSquare, value: "10K+", label: "Telegram Members" },
];

export function AboutSection() {
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
    <section id="about" ref={sectionRef} className="relative py-32 lg:py-40">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
              <span className="w-12 h-px bg-foreground/30" />
              About Us
            </span>
            <h2
              className={`text-6xl md:text-7xl lg:text-8xl font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Meet your
              <br />
              <span className="text-stroke text-[#3b82f6]">mentor.</span>
            </h2>
          </div>

          <div className="lg:col-span-5 flex items-end">
            <p
              className={`text-lg text-muted-foreground transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Spartan Trading Academy was built to make Smart Money Concepts accessible to every Indian trader.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* Mentor 1 */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="aspect-square bg-card border border-foreground/10 overflow-hidden">
              <img
                src="/images/mentor1.jpg"
                alt="Spartan Mentor"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h3 className="text-3xl font-display mb-2">Spartan</h3>
            <p className="text-sm font-mono text-[#3b82f6] mb-6">Founder & Head Mentor</p>

            <div className="space-y-4 text-muted-foreground mb-8">
              <p>
                With years of experience in Smart Money Concepts and Indian markets, Spartan has helped over 15,000 students become independent traders.
              </p>
              <p>
                Known for breaking down complex market structure concepts into simple, actionable strategies — taught in both Tamil and English.
              </p>
              <p>
                Creator of the Evergreen and Legacy TradingView indicators, and the brains behind the automated Telegram alert bots.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="https://youtube.com/@spartantradingacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-5 py-3 text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                <Video className="w-4 h-4" />
                YouTube
              </a>
              <a
                href="https://t.me/staupdates"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-5 py-3 text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Telegram
              </a>
              <a
                href="https://www.tradingview.com/u/SPARTAN-TRADING-ACADEMY/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-5 py-3 text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                TradingView
              </a>
            </div>
          </div>

          {/* Mentor 2 */}
          <div
            className={`transition-all duration-700 delay-100 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="aspect-square bg-card border border-foreground/10 overflow-hidden">
              <img
                src="/images/mentor2.jpg"
                alt="Spartan Mentor"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div
            className={`transition-all duration-700 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h3 className="text-3xl font-display mb-2">Arjun</h3>
            <p className="text-sm font-mono text-[#3b82f6] mb-6">Co-Founder & Senior Mentor</p>

            <div className="space-y-4 text-muted-foreground mb-8">
              <p>
                With years of experience in Smart Money Concepts and Indian markets, Arjun has helped over 15,000 students become independent traders.
              </p>
              <p>
                Known for breaking down complex market structure concepts into simple, actionable strategies — taught in both Tamil and English.
              </p>
              <p>
                Creator of the Evergreen and Legacy TradingView indicators, and the brains behind the automated Telegram alert bots.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href="https://youtube.com/@spartantradingacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-5 py-3 text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                <Video className="w-4 h-4" />
                YouTube
              </a>
              <a
                href="https://t.me/staupdates"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-5 py-3 text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Telegram
              </a>
              <a
                href="https://www.tradingview.com/u/SPARTAN-TRADING-ACADEMY/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-5 py-3 text-sm font-medium hover:bg-foreground/5 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                TradingView
              </a>
            </div>
          </div>
        </div>

        <div
          className={`grid md:grid-cols-3 gap-6 pt-12 border-t border-foreground/10 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="w-8 h-8 text-[#3b82f6] mx-auto mb-4" />
              <div className="text-4xl font-display mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
