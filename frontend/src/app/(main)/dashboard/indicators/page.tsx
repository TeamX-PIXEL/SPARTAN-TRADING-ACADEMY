"use client";

import { useAcademyStore } from "@/lib/academy-store";
import { IndicatorsView } from "./_components/indicators-view";
import { IndicatorMembersView } from "./_components/indicator-members-view";

export default function Page() {
  const view = useAcademyStore((s) => s.view);
  const indicators = useAcademyStore((s) => s.indicators);

  if (view.name === "indicator-members") {
    const indicator = indicators.find((i) => i.id === view.indicatorId);
    return (
      <div className="w-full min-w-0 p-2 md:p-4 overflow-hidden">
        <IndicatorMembersView indicator={indicator} />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 p-2 md:p-4 overflow-hidden">
      <IndicatorsView />
    </div>
  );
}
