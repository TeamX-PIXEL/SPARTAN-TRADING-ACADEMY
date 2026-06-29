"use client";

import React from "react";
import { useApp } from "@/portal/AppContext";
import { MessageSquare, Mail, Phone, ExternalLink, Headphones } from "lucide-react";

const CONTACTS = {
  whatsapp: { label: "WhatsApp", number: "+918667358491", link: "https://wa.me/+918667358491" },
  email: { label: "Email", address: "contact@spartantradingacademy.com", link: "mailto:contact@spartantradingacademy.com" },
  telegram: { label: "Telegram", handle: "@stoic_trader", link: "https://t.me/stoic_trader" },
  phone: { label: "Mobile", number: "+91 86673 58491", link: "tel:+918667358491" },
};

export const SupportPage: React.FC = () => {
  const { user } = useApp();

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white tracking-wide">Support</h1>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Reach out to our team through any of the channels below. We typically respond within a few hours.
        </p>
      </div>

      <div className="space-y-3">
        {/* WhatsApp */}
        <a
          href={CONTACTS.whatsapp.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-[#12151c] border border-[#1e222b] hover:border-emerald-500/30 rounded-xl p-4 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 block">WhatsApp</span>
            <span className="text-sm font-semibold text-white">{CONTACTS.whatsapp.number}</span>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors shrink-0" />
        </a>

        {/* Telegram */}
        <a
          href={CONTACTS.telegram.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-[#12151c] border border-[#1e222b] hover:border-blue-500/30 rounded-xl p-4 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400 block">Telegram</span>
            <span className="text-sm font-semibold text-white">{CONTACTS.telegram.handle}</span>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 transition-colors shrink-0" />
        </a>

        {/* Email */}
        <a
          href={CONTACTS.email.link}
          className="flex items-center gap-4 bg-[#12151c] border border-[#1e222b] hover:border-amber-500/30 rounded-xl p-4 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 block">Email</span>
            <span className="text-sm font-semibold text-white">{CONTACTS.email.address}</span>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors shrink-0" />
        </a>

        {/* Phone */}
        <a
          href={CONTACTS.phone.link}
          className="flex items-center gap-4 bg-[#12151c] border border-[#1e222b] hover:border-rose-500/30 rounded-xl p-4 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400 block">Mobile</span>
            <span className="text-sm font-semibold text-white">{CONTACTS.phone.number}</span>
          </div>
          <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition-colors shrink-0" />
        </a>
      </div>

      <div className="text-center pt-2">
        <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          Business Hours: Mon - Sat, 9:00 AM - 8:00 PM IST
        </p>
      </div>
    </div>
  );
};

export default SupportPage;
