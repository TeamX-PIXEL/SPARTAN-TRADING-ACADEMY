"use client";

import { useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Rajesh K.",
    date: "2 months ago",
    content: "Joined the January batch. The SMC concepts completely changed how I read charts. My win rate went from 40% to 65% in 2 months.",
    rating: 5,
  },
  {
    name: "Priya M.",
    date: "1 month ago",
    content: "The Telegram alerts are a game changer. I get signals while at work and can execute during breaks. Bot accuracy is impressive.",
    rating: 5,
  },
  {
    name: "Karthik S.",
    date: "3 weeks ago",
    content: "Evergreen indicator + Legacy combo is powerful. The order block detection alone is worth the price. Best investment I made.",
    rating: 5,
  },
  {
    name: "Anitha R.",
    date: "1 month ago",
    content: "Tamil sessions made it easy to understand. Mentor explains complex concepts simply. Now I trade independently with confidence.",
    rating: 5,
  },
  {
    name: "Vikram P.",
    date: "2 weeks ago",
    content: "The Discord community is gold. Learning from other traders and getting real-time doubt resolution accelerated my growth.",
    rating: 5,
  },
  {
    name: "Deepak T.",
    date: "5 days ago",
    content: "I tried many courses before. Spartan is the only one that actually teaches you to read the market, not just follow signals blindly.",
    rating: 5,
  },
  {
    name: "Arjun N.",
    date: "3 months ago",
    content: "Started with zero knowledge of SMC. After 2 months, I'm reading market structure like a pro. The mentor's guidance is unmatched.",
    rating: 5,
  },
  {
    name: "Meena S.",
    date: "1 week ago",
    content: "As a part-time trader, the Telegram bots are perfect. I don't need to stare at charts all day. Signals come straight to my phone.",
    rating: 5,
  },
  {
    name: "Suresh R.",
    date: "2 months ago",
    content: "The Legacy indicator is incredibly accurate. Combined with the course, it's the best trading education I've ever received.",
    rating: 5,
  },
  {
    name: "Lakshmi P.",
    date: "4 weeks ago",
    content: "I was skeptical at first, but the results speak for themselves. The risk management module alone saved me from huge losses.",
    rating: 5,
  },
  {
    name: "Rahul V.",
    date: "1 month ago",
    content: "The Evergreen indicator's order block detection is next level. I've tried many paid indicators — nothing comes close to this.",
    rating: 5,
  },
  {
    name: "Divya K.",
    date: "3 days ago",
    content: "Spartan Academy doesn't just teach signals — it teaches you to think like a trader. The mindset shift is real and permanent.",
    rating: 5,
  },
  {
    name: "Manoj T.",
    date: "6 weeks ago",
    content: "The weekly Nifty analysis sessions are gold. I use them alongside the indicator signals for high-probability trades.",
    rating: 5,
  },
  {
    name: "Sneha G.",
    date: "2 weeks ago",
    content: "Tamil + English sessions made learning so easy. The community support is amazing — everyone helps each other grow.",
    rating: 5,
  },
  {
    name: "Pradeep M.",
    date: "1 month ago",
    content: "After retirement, I wanted a new skill. Spartan's structured approach to SMC made trading accessible and profitable for me.",
    rating: 5,
  },
  {
    name: "Kavitha D.",
    date: "10 days ago",
    content: "The Bot 2 Legacy alerts are incredibly reliable. I execute trades during my lunch break and still make consistent profits.",
    rating: 5,
  },
  {
    name: "Ashwin R.",
    date: "4 days ago",
    content: "As a college student, the affordable pricing and EMI option made it possible. Best investment in my financial education.",
    rating: 5,
  },
  {
    name: "Kumar K.",
    date: "1 week ago",
    content: "The combination of course + indicator + alerts is unbeatable. I feel confident trading Bank Nifty every single day now.",
    rating: 5,
  },
];

const PER_PAGE = 6;

const avatarColors = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#2563eb",
  "#7c3aed", "#c026d3", "#e11d48", "#059669", "#0891b2",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function TestimonialsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const sectionRef = useRef<HTMLElement>(null);

  const totalPages = Math.ceil(testimonials.length / PER_PAGE);
  const visible = testimonials.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const goNext = () => {
    if (page < totalPages - 1) {
      setDirection("right");
      setPage((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (page > 0) {
      setDirection("left");
      setPage((p) => p - 1);
    }
  };

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
    <section id="results" ref={sectionRef} className="relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 pt-32 lg:pt-40 text-center">
        <span className={`inline-flex items-center gap-4 text-sm font-mono text-muted-foreground mb-8 transition-all duration-700 justify-center ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          <span className="w-12 h-px bg-foreground/20" />
          Results
          <span className="w-12 h-px bg-foreground/20" />
        </span>

        <h2 className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          Real traders,
          <br />
          <span className="text-stroke text-[#3b82f6]">Real results.</span>
        </h2>

        <p className={`mt-8 text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto transition-all duration-1000 delay-100 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          Hear from our students who transformed their trading with Spartan Academy.
        </p>
      </div>

      {/* Full-width image */}
      <div className={`relative left-1/2 -translate-x-1/2 w-screen -mt-16 transition-all duration-1000 delay-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}>
        <img
          src="/images/connection.png"
          alt=""
          aria-hidden="true"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Testimonials grid */}
      <div className="relative z-10 mt-0 lg:-mt-24 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Side arrows - desktop only */}
        <button
          onClick={goPrev}
          disabled={page === 0}
          className="hidden lg:flex absolute -left-15 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full border border-foreground/20 bg-background/80 backdrop-blur items-center justify-center hover:border-foreground/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={goNext}
          disabled={page === totalPages - 1}
          className="hidden lg:flex absolute -right-15 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full border border-foreground/20 bg-background/80 backdrop-blur items-center justify-center hover:border-foreground/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {visible.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={`bg-card border border-foreground/10 p-8 transition-all duration-500 hover:border-foreground/30 hover-lift ${
                isVisible
                  ? direction === "right"
                    ? "opacity-100 translate-x-0"
                    : "opacity-100 translate-x-0"
                  : "opacity-0 translate-y-12"
              }`}
              style={{
                transitionDelay: `${index * 75}ms`,
                animation: isVisible && direction === "right"
                  ? `slideInRight 0.5s ease forwards`
                  : isVisible && direction === "left"
                  ? `slideInLeft 0.5s ease forwards`
                  : "none",
              }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#3b82f6] text-[#3b82f6]" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed text-sm">{testimonial.content}</p>

              <div className="pt-4 border-t border-foreground/10 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: getAvatarColor(testimonial.name) }}
                >
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.date}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-2 mb-20">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === page ? "bg-[#3b82f6]" : "bg-foreground/20 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
