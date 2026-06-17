import { Course, Indicator, Bot } from "@/types/portal";

// Let's seed timestamps relative to current date 2026-06-12T22:27:53-07:00
// Current: 2026-06-12T22:27:53-07:00
const formatRelativeTime = (daysOffset: number, hoursOffset: number, minutesOffset: number) => {
  const base = new Date("2026-06-12T22:27:53-07:00");
  base.setDate(base.getDate() + daysOffset);
  base.setHours(base.getHours() + hoursOffset);
  base.setMinutes(base.getMinutes() + minutesOffset);
  return base.toISOString();
};

export const MOCK_COURSES: Course[] = [
  {
    uuid: "course-1",
    title: "The Edge: Advanced Order Flow Mastery",
    description: "Deconstruct market microstructures, order book imbalances, and institutional footprint mapping. Gain raw insight into tape entry.",
    longDescription: "Our signature, high-intensity live trading workshop. Over the course of 3 detailed interactive modules, you will explore order book configurations, order matching algorithms, real-time liquidity sweep mechanics, and delta divergence on footprints. This live masterclass will prepare you to trade alongside larger market makers.",
    price: 499,
    category: "Masterclass",
    image: "https://picsum.photos/seed/edge/600/400",
    features: [
      "Footprint Chart Architecture",
      "Dynamic Liquidity Sweep Scanners",
      "Staged Position Accumulation Logic",
      "Institutional Tape Execution Strategies",
      "1 Year Free Discord Support"
    ],
    duration: "1 Month",
    lecturer: "Marcus Vance (Ex-Prop Desk Lead)",
    difficulty: "Advanced",
    scheduled_at: formatRelativeTime(0, 0, 15), // Starts in 15 minutes
    estimated_duration: 120
  },
  {
    uuid: "course-2",
    title: "Quantitative Arbitrage & Grid Frameworks",
    description: "Learn mathematical modeling of mean-reverting pairs, statistical arbitrage bands, and high-frequency grids inside modern exchanges.",
    longDescription: "Master statistical cointegration, historical correlation coefficients, and automated step grids. You will build and test a fully fleshed out grid model that capitalizes on minor price differences across decentralized and centralized platforms. Includes downloadable models and Pine scripts.",
    price: 349,
    category: "Quantitative",
    image: "https://picsum.photos/seed/quant/600/400",
    features: [
      "Cointegration Mapping Spreadsheet",
      "Dynamic Step-Size Calculation Form",
      "Capital Allocation Variance Model",
      "Exchange API Lag Minimization Tools",
      "1 Year Free Discord Support"
    ],
    duration: "1 Month",
    lecturer: "Dr. Elena Rostova",
    difficulty: "Intermediate",
    scheduled_at: formatRelativeTime(0, -1, 30), // Started 1 hour and 30 mins ago (LIVE NOW)
    estimated_duration: 180
  },
  {
    uuid: "course-3",
    title: "Macro Risk Hedging & Crypto Options",
    description: "Implement structural gamma-scalping and implied volatility arbitrage models. Defend your capital during black swan events.",
    longDescription: "Protect and hedge capital positions against massive systemic shifts. You will learn to draft delta-neutral portfolios, buy and sell options combinations safely, and run active premium-decay cycles (the option seller advantage).",
    price: 299,
    category: "Risk Management",
    image: "https://picsum.photos/seed/macro/600/400",
    features: [
      "Implied Volatility (IV) Heatmaps",
      "Delta-Neutral Greeks Tracker",
      "Black-Scholes Modeling Scripts",
      "Multi-Leg Options Combo Matrix",
      "1 Year Free Discord Support"
    ],
    duration: "1 Month",
    lecturer: "Julian Cross",
    difficulty: "Advanced",
    scheduled_at: formatRelativeTime(1, 4, 0), // Starts tomorrow in 1 day and 4 hours
    estimated_duration: 90
  },
  {
    uuid: "course-4",
    title: "The Scalping Blueprint: 5m Trend Crushing",
    description: "High-probability scalp entries using price action clusters, volume profile nodes, and Fibonacci extension points.",
    longDescription: "Uncover simple, actionable trading keys optimized for short term trading windows. We cut through the indicators to focus strictly on naked chart breakouts, session high runs, and retail stop liquidity sweeps.",
    price: 199,
    category: "Price Action",
    image: "https://picsum.photos/seed/scalp/600/400",
    features: [
      "5-Minute Volume Delta Analyzer",
      "Session Initial Balance Levels",
      "Speed of Tape Acceleration Metrics",
      "Dynamic Stop-Loss Compression Rule",
      "1 Year Free Discord Support"
    ],
    duration: "1 Month",
    lecturer: "Marcus Vance",
    difficulty: "Beginner",
    scheduled_at: formatRelativeTime(-3, 0, 0), // Already ended 3 days ago (Completed)
    estimated_duration: 120
  },
  {
    uuid: "course-5",
    title: "Smart Money Concepts: Institutional Order Blocks",
    description: "Decode how smart money accumulates and distributes positions using order blocks, break of structure, and fair value gaps.",
    longDescription: "A comprehensive deep-dive into the core principles of Smart Money Concepts. Learn to identify institutional order blocks on higher timeframes, map break of structure patterns, and trade fair value gaps with precision. Includes live market breakdowns and case studies from Nifty, Bank Nifty, and crypto markets.",
    price: 399,
    category: "Masterclass",
    image: "https://picsum.photos/seed/smc/600/400",
    features: [
      "Higher Timeframe Order Block Mapping",
      "Break of Structure Pattern Recognition",
      "Fair Value Gap Entry Strategies",
      "Live Market Breakdown Case Studies",
      "1 Year Free Discord Support"
    ],
    duration: "2 Months",
    lecturer: "Karthik Selvan",
    difficulty: "Intermediate",
    scheduled_at: formatRelativeTime(2, 6, 0), // Starts in 2 days and 6 hours
    estimated_duration: 150
  },
  {
    uuid: "course-6",
    title: "Algorithmic Trading with Pine Script v5",
    description: "Build, backtest, and deploy automated trading strategies using TradingView's Pine Script v5 language from scratch.",
    longDescription: "From zero coding experience to fully automated strategies. This course walks you through Pine Script v5 syntax, built-in functions, strategy backtesting, and live alert integration. Build your own custom indicators and trading bots that execute signals automatically via webhooks.",
    price: 449,
    category: "Quantitative",
    image: "https://picsum.photos/seed/pine/600/400",
    features: [
      "Pine Script v5 Complete Syntax Guide",
      "Strategy Backtesting Framework",
      "Webhook Alert Integration",
      "Custom Indicator Development Workshop",
      "1 Year Free Discord Support"
    ],
    duration: "2 Months",
    lecturer: "Dr. Elena Rostova",
    difficulty: "Advanced",
    scheduled_at: formatRelativeTime(5, 0, 0), // Starts in 5 days
    estimated_duration: 200
  }
];

export const MOCK_INDICATORS: Indicator[] = [
  {
    uuid: "ind-1",
    title: "DealDeck Liquidity Radar",
    description: "Bridges institutional dark pool orders and resting limit levels straight onto your TradingView panel. Spot thick support walls.",
    longDescription: "The definitive indicator to locate buy and sell walls before they execute. Highlights thick order blocks with custom contrast bars and signals high-probability reversal clusters when volume tapers near key historical zones.",
    price: 150,
    category: "Scripts",
    image: "https://picsum.photos/seed/radar/600/400",
    features: [
      "Real-time institutional liquidity bars",
      "Dark pool sweep alerts",
      "TradingView Pine Script v5 optimized code",
      "Multitimeframe sweep metrics"
    ],
    scriptType: "Pine Script (v5)",
    accuracy: "84.2%",
    timeframe: "1m, 5m, 15m, 1h"
  },
  {
    uuid: "ind-2",
    title: "Algorithmic Speed Tracker v4",
    description: "Tracks volume delta acceleration and buying/selling pressure ticks. Spot trends 3-4 blocks ahead of retail moving averages.",
    longDescription: "A specialized indicator measuring the velocity of price matching on the blockchain and centralized API feeds. Provides quick trend confirmation points, momentum divergence alerts, and auto-drawn support zones.",
    price: 125,
    category: "Momentum",
    image: "https://picsum.photos/seed/speed/600/400",
    features: [
      "Real-time velocity index line",
      "Buyer vs Seller delta percentage meter",
      "Sound alarms and email webhook channels",
      "Excludes low volume wash-trades automatically"
    ],
    scriptType: "Pine Script & MT5",
    accuracy: "79.8%",
    timeframe: "Tick and 1m Only"
  }
];

export const MOCK_BOTS: Bot[] = [
  {
    uuid: "bot-1",
    title: "Delta Drift Grid Executer",
    description: "Dynamically updates grid widths using real-time Average True Range (ATR) fluctuations. High-performance stablecoin channel generator.",
    longDescription: "This advanced execution engine maintains a strict neutral delta, trading currency pairs and heavy stablecoin brackets. Spawns automated sub-orders that profit from high frequency noise inside any tight trading cluster.",
    price: 250,
    category: "Grid Execution",
    image: "https://picsum.photos/seed/bot1/600/400",
    features: [
      "ATR-weighted multi-tier margins",
      "Emergency volatility circuit breaker",
      "Auto-hedging spot collateral mode",
      "Telegram instant webhook reporter"
    ],
    exchange: "Binance, Bybit, OKX",
    apy: "112.4%",
    status: "Idle"
  },
  {
    uuid: "bot-2",
    title: "Trend-Rider EMA Breakout AutoBot",
    description: "Auto-executes momentum breakouts across the top 15 highest-volume altcoins. Perfect for passive systematic swing traders.",
    longDescription: "Monitors custom triple exponential moving average cross structures on a server-side engine. Triggers automated market entries and trailing stops based on real-time relative strength metrics.",
    price: 199,
    category: "Systematic Swing",
    image: "https://picsum.photos/seed/bot2/600/400",
    features: [
      "Dynamic trailing take-profit lock",
      "Staggered position-sizing scaling ladder",
      "Maximum drawndown protection lock (3%)",
      "One-click sync with TradingView Webhooks"
    ],
    exchange: "Bybit, Kraken",
    apy: "89.1%",
    status: "Running"
  }
];
