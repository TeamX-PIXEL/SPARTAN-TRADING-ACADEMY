"use client";

import { ArrowRight, Video, MessageSquare, BarChart3, Mail, Phone } from "lucide-react";

const footerLinks = [
  {
    title: "Products",
    links: [
      { name: "Monthly Courses", href: "#courses" },
      { name: "Evergreen Indicator", href: "#indicators" },
      { name: "Legacy Indicator", href: "#indicators" },
      { name: "Telegram Alerts", href: "#alerts" },
      { name: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "YouTube Channel", href: "https://youtube.com/@spartantradingacademy" },
      { name: "Telegram Updates", href: "https://t.me/staupdates" },
      { name: "Telegram SMC", href: "https://t.me/spartantradingacademy" },
      { name: "TradingView", href: "https://www.tradingview.com/u/SPARTAN-TRADING-ACADEMY/" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "#about" },
      { name: "Results", href: "#results" },
      { name: "Contact", href: "#contact" },
      { name: "Terms & Conditions", href: "#" },
      { name: "Privacy Policy", href: "#" },
    ],
  },
];

export function FooterSection() {
  return (
    <footer id="contact" className="relative py-32 lg:py-40 bg-[oklch(0.09_0.01_260)] text-white overflow-hidden">
      {/* Footer image background */}
      <div className="absolute inset-0 opacity-10">
        <img
          src="/images/footer_image.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 mb-20">
          <div className="lg:col-span-5">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-display tracking-tight leading-[0.9] mb-8">
              Ready to
              <br />
              <span className="text-stroke text-[#3b82f6]">start trading?</span>
            </h2>
            <p className="text-lg text-white/60 mb-8 max-w-md">
              Join the next batch or subscribe to our indicators and alerts. Your trading journey starts here.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <a
                href="https://wa.me/+918667358491"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition-colors"
              >
                <Phone className="w-4 h-4" />
                WhatsApp Us
              </a>
              <a
                href="mailto:contact@spartantradingacademy.com"
                className="inline-flex items-center gap-2 border border-white/20 text-white px-6 py-3 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email Us
              </a>
            </div>

            <div className="flex gap-4">
              <a href="https://youtube.com/@spartantradingacademy" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors">
                <Video className="w-5 h-5" />
              </a>
              <a href="https://t.me/staupdates" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </a>
              <a href="https://www.tradingview.com/u/SPARTAN-TRADING-ACADEMY/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors">
                <BarChart3 className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-8">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="text-sm font-bold text-white mb-6">
                  {group.title}
                </h4>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-sm text-white/60 hover:text-white transition-colors"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/icon.png" alt="Spartan Trading Academy" className="w-8 h-8" />
            <span className="font-display text-xl text-white">SPARTAN TRADING</span>
            <span className="font-mono text-[10px] text-white/40">ACADEMY</span>
          </div>
          <p className="text-xs text-white/40 text-center md:text-right max-w-lg">
            Trading involves financial risk. Past performance is not indicative of future results. Please trade responsibly.
          </p>
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Sargon Trading PVT.LTD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
