"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Clock, Users, PlayCircle, MessageSquare, Headphones, ArrowRight } from "lucide-react";

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const target = nextMonth.getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-4">
      {[
        { label: "Days", value: timeLeft.days },
        { label: "Hours", value: timeLeft.hours },
        { label: "Minutes", value: timeLeft.minutes },
        { label: "Seconds", value: timeLeft.seconds },
      ].map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="bg-black border border-white/20 w-20 h-20 flex items-center justify-center">
            <span className="text-3xl font-display text-white">{String(unit.value).padStart(2, "0")}</span>
          </div>
          <span className="text-xs text-white/40 mt-2 font-mono">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

const includes = [
  { icon: PlayCircle, text: "Live sessions (Tamil & English)" },
  { icon: Clock, text: "Recorded sessions access" },
  { icon: MessageSquare, text: "Private Discord community" },
  { icon: Headphones, text: "1-on-1 doubt clearing" },
  { icon: Calendar, text: "Monthly new batch" },
  { icon: Users, text: "Peer learning network" },
];

const syllabus = [
  { week: "Week 1", topic: "Smart Money Concepts & Market Structure" },
  { week: "Week 2", topic: "Order Blocks, Breakers & Liquidity Zones" },
  { week: "Week 3", topic: "Nifty & Bank Nifty Analysis (Live)" },
  { week: "Week 4", topic: "Trading Psychology & Risk Management" },
];

export function CoursesSection() {
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
    <section id="courses" ref={sectionRef} className="relative py-32 lg:py-40 overflow-hidden">
      {/* Header with image background */}
      <div className="relative mb-20">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/images/image1.png"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
                <span className="w-12 h-px bg-foreground/30" />
                Monthly Batches
              </span>
              <h2
                className={`text-6xl md:text-7xl lg:text-8xl font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Next batch
                <br />
                <span className="text-stroke text-[#3b82f6]">starts soon.</span>
              </h2>
            </div>

            <div className="lg:col-span-5 flex flex-col items-end justify-end">
              <p
                className={`text-lg text-muted-foreground mb-6 text-right transition-all duration-1000 delay-200 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                New batch starts every 1st of the month. Limited seats. Register now to secure your spot.
              </p>
              <div
                className={`transition-all duration-1000 delay-300 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <CountdownTimer />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`relative border border-foreground/10 bg-card overflow-hidden transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* What's Included */}
              <div>
                <h3 className="text-2xl font-display mb-8">What&apos;s Included</h3>
                <ul className="space-y-4">
                  {includes.map((item) => (
                    <li key={item.text} className="flex items-center gap-4">
                      <div className="w-10 h-10 border border-foreground/20 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-[#3b82f6]" />
                      </div>
                      <span className="text-muted-foreground">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Syllabus */}
              <div>
                <h3 className="text-2xl font-display mb-8">Syllabus Overview</h3>
                <div className="space-y-4 mb-8">
                  {syllabus.map((week) => (
                    <div key={week.week} className="flex items-start gap-4 p-4 border border-foreground/10">
                      <span className="font-mono text-xs text-[#3b82f6] shrink-0">{week.week}</span>
                      <span className="text-muted-foreground">{week.topic}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="#"
                  className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  Register Now
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
