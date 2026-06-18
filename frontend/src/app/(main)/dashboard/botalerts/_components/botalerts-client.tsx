"use client";

import { useAcademyStore } from "@/lib/academy-store";
import { BotsView } from "./bots-view";
import { BotMembersView } from "./bot-members-view";

export function BotalertsClient() {
  const view = useAcademyStore((s) => s.view);
  const bots = useAcademyStore((s) => s.bots);

  if (view.name === "bot-members") {
    const bot = bots.find((b) => b.id === view.botId);
    return (
      <div className="flex flex-col gap-4 md:gap-6 p-4">
        <BotMembersView bot={bot} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4">
      <BotsView />
    </div>
  );
}
