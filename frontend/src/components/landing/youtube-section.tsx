"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, Video } from "lucide-react";

export function YouTubeSection() {
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
    <section id="youtube" ref={sectionRef} className="relative py-32 lg:py-40">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
              <span className="w-12 h-px bg-foreground/30" />
              YouTube Channel
            </span>
            <h2
              className={`text-6xl md:text-7xl lg:text-8xl font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Learn
              <br />
              <span className="text-stroke text-[#3b82f6]">Smart Money.</span>
            </h2>
          </div>

          <div className="lg:col-span-5 flex items-end">
            <p
              className={`text-lg text-muted-foreground transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Free educational content on Technical Analysis, SMC, Price Action, and Day Trading — in Tamil & English.
            </p>
          </div>
        </div>

        {/* Channel Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Channel 1 */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="bg-card border border-foreground/10 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src="/images/youtube_image1.jpg"
                  alt="Spartan Trading Academy"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-xl font-display">Spartan Trading Academy</h3>
                  <p className="text-sm text-muted-foreground">50K+ subscribers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Welcome To Spartan Trading Academy...
              </p>
              <div className="text-sm text-muted-foreground leading-relaxed mb-6 space-y-2 max-h-40 overflow-y-auto pr-2">
                <p>Hi! My name is John Peter from Tamilnadu-India, and the founder of Spartan Trading Academy.</p>
                <p>You won&apos;t see me post pictures of Lamborghini, Ferrari, or hot chicks because it won&apos;t help you become a better trader.</p>
                <p>Instead, what you&apos;ll get is educational videos on Technical Analysis, Day Trading, Investing and Smart Money Concepts.</p>
                <p>This channel brings a variety of great content, such as:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Technical Analysis</li>
                  <li>Smart Money Trading (SMC)</li>
                  <li>Advanced Pattern Trading</li>
                  <li>Option Trading</li>
                  <li>Price Action Trading</li>
                  <li>Tutorial Videos</li>
                  <li>Day Trading Strategy</li>
                  <li>Helping Make Better Profits</li>
                </ul>
                <p className="pt-2 font-medium text-white">What is this channel really about?</p>
                <p>In short, this channel giving you detail information on what you want to do to grow your financial freedom rapidly and faster.</p>
              </div>
              <div className="flex gap-6 pt-6 border-t border-foreground/10">
                <div>
                  <div className="text-xl font-display">50K+</div>
                  <div className="text-xs text-muted-foreground font-mono">Subscribers</div>
                </div>
                <div>
                  <div className="text-xl font-display">500+</div>
                  <div className="text-xs text-muted-foreground font-mono">Videos</div>
                </div>
              </div>
              <a
                href="https://www.youtube.com/channel/UC_Gu0M5HeSTaLDV3QkKwkzg"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-full flex items-center justify-center gap-2 bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition-colors rounded-xl"
              >
                <Video className="w-4 h-4" />
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Channel 2 */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="bg-card border border-foreground/10 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src="/images/youtube_image2.jpg"
                  alt="Spartan Trading Academy"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-xl font-display">Spartan Trading Academy</h3>
                  <p className="text-sm text-muted-foreground">50K+ subscribers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Welcome To Spartan Trading Academy...
              </p>
              <div className="text-sm text-muted-foreground leading-relaxed mb-6 space-y-2 max-h-40 overflow-y-auto pr-2">
                <p>Hi! My name is John Peter from Tamilnadu-India, and the founder of Spartan Trading Academy.</p>
                <p>You won&apos;t see me post pictures of Lamborghini, Ferrari, or hot chicks because it won&apos;t help you become a better trader.</p>
                <p>Instead, what you&apos;ll get is educational videos on Technical Analysis, Day Trading, Investing and Smart Money Concepts.</p>
                <p>This channel brings a variety of great content, such as:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Technical Analysis</li>
                  <li>Smart Money Trading (SMC)</li>
                  <li>Advanced Pattern Trading</li>
                  <li>Option Trading</li>
                  <li>Price Action Trading</li>
                  <li>Tutorial Videos</li>
                  <li>Day Trading Strategy</li>
                  <li>Helping Make Better Profits</li>
                </ul>
                <p className="pt-2 font-medium text-white">What is this channel really about?</p>
                <p>In short, this channel giving you detail information on what you want to do to grow your financial freedom rapidly and faster.</p>
              </div>
              <div className="flex gap-6 pt-6 border-t border-foreground/10">
                <div>
                  <div className="text-xl font-display">50K+</div>
                  <div className="text-xs text-muted-foreground font-mono">Subscribers</div>
                </div>
                <div>
                  <div className="text-xl font-display">500+</div>
                  <div className="text-xs text-muted-foreground font-mono">Videos</div>
                </div>
              </div>
              <a
                href="https://www.youtube.com/channel/UC_Gu0M5HeSTaLDV3QkKwkzg"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-full flex items-center justify-center gap-2 bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition-colors rounded-xl"
              >
                <Video className="w-4 h-4" />
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div
          className={`text-center transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <a
            href="https://www.youtube.com/channel/UC_Gu0M5HeSTaLDV3QkKwkzg"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all videos on YouTube
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
