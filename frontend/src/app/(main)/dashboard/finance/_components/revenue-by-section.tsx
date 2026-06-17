import { Bot, GraduationCap, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

import type { SectionRevenue } from "../_lib/derive-payments";

interface RevenueBySectionProps {
  sections: SectionRevenue[];
  totalRevenue: number;
}

const SECTION_ICONS = {
  academy: GraduationCap,
  indicators: TrendingUp,
  bot_alerts: Bot,
} as const;

export function RevenueBySection({ sections, totalRevenue }: RevenueBySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Section</CardTitle>
        <CardDescription>How much each product line contributed this period.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => {
          const Icon = SECTION_ICONS[section.section];
          const share = totalRevenue > 0 ? (section.revenue / totalRevenue) * 100 : 0;
          return (
            <div key={section.section} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid size-7 place-content-center rounded-sm bg-muted">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-none">{section.label}</p>
                    <p className="mt-1 text-muted-foreground text-xs truncate">{section.topItem ?? "No sales yet"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatCurrency(section.revenue, { noDecimals: true })}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {section.transactionCount.toLocaleString()} txn
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{share.toFixed(1)}% of total</Badge>
                <span className="text-muted-foreground text-xs">Top: {section.topItem ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
