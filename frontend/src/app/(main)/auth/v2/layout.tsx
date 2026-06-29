import type { ReactNode } from "react";

import { GraduationCap } from "lucide-react";

import { Separator } from "@/components/ui/separator";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full rounded-3xl bg-primary lg:flex">
          <div className="absolute top-10 space-y-1 px-10 text-primary-foreground">
            <GraduationCap className="size-10" />
            <h1 className="font-medium text-2xl">Spartan Trading Academy</h1>
            <p className="text-sm">Learn. Trade. Grow.</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Ready to start?</h2>
              <p className="text-sm">Create your account and access premium courses, indicators, and live trading alerts.</p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Need help?</h2>
              <p className="text-sm">
                Reach out via WhatsApp, Telegram, or email — our support team is just a click away.
              </p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
