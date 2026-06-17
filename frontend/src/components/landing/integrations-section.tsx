"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, ArrowRight, Zap, TrendingUp, Bell } from "lucide-react";

function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);
      const gridSize = 60;
      const time = timeRef.current;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          const wave = Math.sin(x * 0.01 + y * 0.01 + time) * 0.5 + 0.5;
          const size = 1 + wave * 2;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(96, 165, 250, 0.06)";
          ctx.fill();
        }
      }
      const pulseY = (time * 30) % height;
      ctx.strokeStyle = "rgba(96, 165, 250, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, pulseY);
      ctx.lineTo(width, pulseY);
      ctx.stroke();
      timeRef.current += 0.02;
      frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function DotGraph({
  color = "white",
  height = 32,
  freq1 = 0.35,
  freq2 = 0.12,
  freqT = 0.7,
  speed = 0.025,
  baseline = 0.3,
  amplitude = 0.5,
}: {
  color?: string;
  height?: number;
  freq1?: number;
  freq2?: number;
  freqT?: number;
  speed?: number;
  baseline?: number;
  amplitude?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const timeRef = useRef(Math.random() * 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.offsetWidth || 300;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, W, H);
      const t = timeRef.current;
      const cols = Math.floor(W / 8);

      for (let i = 0; i < cols; i++) {
        const raw = baseline + amplitude * Math.sin(i * freq1 + t) * Math.cos(i * freq2 + t * freqT);
        const v = Math.max(0, Math.min(1, raw));
        const dotY = H - 4 - v * (H - 8);
        const x = i * 8 + 4;
        const alpha = 0.15 + v * 0.55;
        const r = 1.5 + v * 1.2;

        ctx.beginPath();
        ctx.arc(x, dotY, r, 0, Math.PI * 2);
        ctx.fillStyle = color === "green"
          ? `rgba(96, 165, 250, ${alpha})`
          : `rgba(147, 197, 253, ${alpha})`;
        ctx.fill();
      }

      timeRef.current += speed;
      frameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameRef.current);
  }, [color, height, freq1, freq2, freqT, speed, baseline, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px`, display: "block" }}
    />
  );
}

const bots = [
  {
    name: "Bot 1: Evergreen Alerts",
    icon: Zap,
    description: "Advanced SMC-based alerts with premium filters and multi-market coverage.",
    filters: [
      { category: "Currency Pairs", items: "24 pairs (EURUSD, GBPUSD, USDJPY...)" },
      { category: "Commodities", items: "XAUUSD, XAGUSD, USOIL, UKOIL" },
      { category: "Crypto", items: "BTCUSD, ETHUSD, BTCUSDT, ETHUSDT" },
      { category: "Indices", items: "NAS100, SPX500, US30, BANKNIFTY, NIFTY" },
      { category: "Futures", items: "YM, NQ, ES, CL, GC, SI + 14 more" },
      { category: "Timeframes", items: "1M, 5M, 15M, 1H, 4H, 1D" },
      { category: "Entry Models", items: "3 Entry Models" },
      { category: "Entry Filters", items: "Premium/Discount Zone, Order Paring, CR, SMT" },
      { category: "SMC Filters", items: "SMT Swing, Mitigation (Strong/Weak)" },
      { category: "Direction", items: "Bull / Bear" },
    ],
  },
  {
    name: "Bot 2: Legacy Alerts",
    icon: TrendingUp,
    description: "Classic entry-based alerts with sweep and no-sweep filter system.",
    filters: [
      { category: "Currency Pairs", items: "24 pairs (EURUSD, GBPUSD, USDJPY...)" },
      { category: "Commodities", items: "XAUUSD, XAGUSD, USOIL, UKOIL" },
      { category: "Crypto", items: "BTCUSD, ETHUSD, BTCUSDT, ETHUSDT" },
      { category: "Indices", items: "NAS100, SPX500, US30, BANKNIFTY, NIFTY" },
      { category: "Futures", items: "YM, NQ, ES, CL, GC, SI + 14 more" },
      { category: "Timeframes", items: "1M, 5M, 15M, 1H, 4H, 1D" },
      { category: "Entry Models", items: "2 Entry Models" },
      { category: "Entry Filters", items: "Premium/Discount Zone, CR (First Class), Order Paring, SMT"  },
      { category: "SMC Filters", items: "SMT Swing, Mitigation (Strong/Weak)" },
      { category: "Direction", items: "Bull / Bear" },
    ],
  },
];

export function AlertsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
    <section id="alerts" ref={sectionRef} className="relative py-32 lg:py-40 bg-black text-white overflow-hidden">
      <GridBackground />
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-8 mb-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-4 mb-6">
              <span className="flex items-center gap-2 px-3 py-1 bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
                LIVE
              </span>
              <span className="text-sm font-mono text-white/40">
                {time ? `${time.toLocaleTimeString("en-GB")} UTC` : ""}
              </span>
            </div>

            <span className="inline-flex items-center gap-3 text-sm font-mono text-white/40 mb-8">
              <span className="w-12 h-px bg-white/20" />
              Telegram Alerts
            </span>
            <h2
              className={`text-6xl md:text-7xl lg:text-8xl font-display tracking-tight leading-[0.9] text-white transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <span className="block">Live alerts</span>
              <span className="block">
                <span className="text-stroke text-[#3b82f6]">world wide</span>
              </span>
              <span className="block">
                <span className="text-stroke text-[#3b82f6]/60">to your phone.</span>
              </span>
            </h2>
          </div>

          <div className="lg:col-span-5 flex items-end justify-center lg:justify-start lg:pl-12">
            <div
              className={`bg-black rounded-full p-8 lg:p-12 transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <img
                src="/images/world.png"
                alt="Global network"
                className="w-64 lg:w-96 h-auto object-contain"
              />
            </div>
          </div>
        </div>

        <p
          className={`text-lg text-white/60 mb-12 max-w-2xl transition-all duration-1000 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Our indicators power two Telegram bots that send live trade alerts directly to your phone. No manual chart watching needed.
        </p>

        <div
          className={`flex items-center justify-center gap-4 mb-20 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex items-center gap-3 px-6 py-3 bg-background border border-white/20">
            <TrendingUp className="w-5 h-5 text-[#3b82f6]" />
            <span className="text-sm font-mono text-white">Indicators</span>
          </div>
          <ArrowRight className="w-5 h-5 text-white/30" />
          <div className="flex items-center gap-3 px-6 py-3 bg-background border border-white/20">
            <Bot className="w-5 h-5 text-[#a78bfa]" />
            <span className="text-sm font-mono text-white">Backend</span>
          </div>
          <ArrowRight className="w-5 h-5 text-white/30" />
          <div className="flex items-center gap-3 px-6 py-3 bg-background border border-white/20">
            <Bell className="w-5 h-5 text-[#67e8f9]" />
            <span className="text-sm font-mono text-white">Bot</span>
          </div>
          <ArrowRight className="w-5 h-5 text-white/30" />
          <div className="flex items-center gap-3 px-6 py-3 bg-background border border-white/20">
            <Zap className="w-5 h-5 text-[#fbbf24]" />
            <span className="text-sm font-mono text-white">Your Telegram</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {bots.map((bot, index) => (
            <div
              key={bot.name}
              className={`bg-background/50 border border-white/10 p-8 lg:p-10 transition-all duration-700 hover:border-white/30 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4 mb-6">
                <bot.icon className="w-8 h-8 text-[#3b82f6]" />
                <h3 className="text-2xl font-display text-white">{bot.name}</h3>
              </div>

              <p className="text-white/60 mb-6">{bot.description}</p>

              {/* Dot graph visualization */}
              <div className="mb-6">
                <DotGraph
                  color={index === 0 ? "green" : "white"}
                  height={36}
                  freq1={index === 0 ? 0.45 : 0.22}
                  freq2={index === 0 ? 0.18 : 0.07}
                  freqT={index === 0 ? 1.1 : 0.4}
                  speed={index === 0 ? 0.032 : 0.015}
                  baseline={index === 0 ? 0.4 : 0.25}
                  amplitude={index === 0 ? 0.45 : 0.6}
                />
              </div>

              {/* Filters */}
              <div className="space-y-3">
                {bot.filters.map((filter) => (
                  <div key={filter.category} className="flex items-start gap-3 py-2 border-b border-white/10">
                    <span className="text-xs font-mono text-[#3b82f6] shrink-0 w-28">{filter.category}</span>
                    <span className="text-sm text-white/60">{filter.items}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Subscribe to Alerts
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
