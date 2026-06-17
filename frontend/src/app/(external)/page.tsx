"use client";

import dynamic from "next/dynamic";

const Navigation = dynamic(() => import("@/components/landing/navigation").then(m => m.Navigation), { ssr: false });
const HeroSection = dynamic(() => import("@/components/landing/hero-section").then(m => m.HeroSection), { ssr: false });
const FeaturesSection = dynamic(() => import("@/components/landing/features-section").then(m => m.FeaturesSection), { ssr: false });
const CoursesSection = dynamic(() => import("@/components/landing/how-it-works-section").then(m => m.CoursesSection), { ssr: false });
const IndicatorsSection = dynamic(() => import("@/components/landing/infrastructure-section").then(m => m.IndicatorsSection), { ssr: false });
const AlertsSection = dynamic(() => import("@/components/landing/integrations-section").then(m => m.AlertsSection), { ssr: false });
const PricingSection = dynamic(() => import("@/components/landing/pricing-section").then(m => m.PricingSection), { ssr: false });
const YouTubeSection = dynamic(() => import("@/components/landing/youtube-section").then(m => m.YouTubeSection), { ssr: false });
const TestimonialsSection = dynamic(() => import("@/components/landing/testimonials-section").then(m => m.TestimonialsSection), { ssr: false });
const AboutSection = dynamic(() => import("@/components/landing/developers-section").then(m => m.AboutSection), { ssr: false });
const CtaSection = dynamic(() => import("@/components/landing/cta-section").then(m => m.CtaSection), { ssr: false });
const FooterSection = dynamic(() => import("@/components/landing/footer-section").then(m => m.FooterSection), { ssr: false });
const WhatsAppFloat = dynamic(() => import("@/components/landing/whatsapp-float").then(m => m.WhatsAppFloat), { ssr: false });

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden" suppressHydrationWarning>
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <CoursesSection />
      <IndicatorsSection />
      <AlertsSection />
      <PricingSection />
      <YouTubeSection />
      <TestimonialsSection />
      <AboutSection />
      <CtaSection />
      <FooterSection />
      <WhatsAppFloat />
    </main>
  );
}
