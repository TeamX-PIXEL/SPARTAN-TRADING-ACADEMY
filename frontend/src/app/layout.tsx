import type { ReactNode } from "react";

import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { AuthProvider } from "@/components/providers";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html
      lang="en"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIACAAIAMBIgACEQEDEQH/xAAZAAACAwEAAAAAAAAAAAAAAAAFBwEEBgj/xAApEAACAgEDAgUEAwAAAAAAAAABAgMEEQAFEiExBjJBUXETIpGhYYGx/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAED/8QAGhEAAgMBAQAAAAAAAAAAAAAAAAIBAxIRIf/aAAwDAQACEQMRAD8A6p1QsbvSgumo0vKyEMjRoCxVQM5OO2rNyUwU55VHJo0ZgPfAJ0rNym39dp2yn4c2+C7Nu1aW1uE07AfVBwOCtyBBHPP9a0rTcmVlmIGRW3qjYuLUSbjYZBIiOOJYH2z3/kdxojpP0fFB8QT7/TBjkrbdXF/bbqIUdOGAytn1z+j8abO3zNYo15nGGkjVyPYkZ0srlPJFVsWR2CLVurXIS1YhiLjoJHAz+dYCzt0da9FVaZdz2NZMpVW1Gv0gTnDq3mUHr5h2wc6YU1aCdlaaGKRlBALoCQD376F2NiWWSQpOYkbyosMeE+On+/rURslddGRrbXDPctVIHG07GJSJaxsRkP1yQiL5Q3HJ6n11v6turP8AZVnhk4gHEbhsD07aGwbCqzK9i1JYUHJWSOPDfP259vxopBUrV3LwV4Y3IwWRApI9umjNoIuT/9k=" />
        <ThemeBootScript />
      </head>
      <body className={`${fontVars} ${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} min-h-screen antialiased font-sans`}>
        <AuthProvider>
          <TooltipProvider>
            <PreferencesStoreProvider
              themeMode={theme_mode}
              themePreset={theme_preset}
              contentLayout={content_layout}
              navbarStyle={navbar_style}
              font={font}
            >
              {children}
              <Toaster />
            </PreferencesStoreProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
