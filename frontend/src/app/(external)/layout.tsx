import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Spartan Trading Academy - Master the Markets",
  description:
    "Professional trading education, premium TradingView indicators, and real-time Telegram alerts. Join monthly batches and learn Smart Money Concepts.",
};

export default function ExternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="landing-page dark" suppressHydrationWarning>
      {children}
    </div>
  );
}
