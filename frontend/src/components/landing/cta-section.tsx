"use client";

import { MessageCircle } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden">
      {/* World image background */}
      <div className="absolute inset-0 opacity-4">
        <img
          src="/images/world.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="text-center">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
            <span className="w-12 h-px bg-foreground/30" />
            Get Started
            <span className="w-12 h-px bg-foreground/30" />
          </span>
          <h2 className="text-6xl md:text-7xl lg:text-9xl font-display tracking-tight leading-[0.9] mb-8">
            Start your
            <br />
            <span className="text-stroke text-[#3b82f6]">trading journey.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12">
            Join 15,000+ students who transformed their trading with Spartan Academy. Next batch starts soon.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-4 text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Join Next Batch
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
            <a
              href="https://wa.me/+918667358491"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-8 py-4 text-sm font-medium hover:bg-foreground/5 transition-colors"
            >
              Talk to Us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
