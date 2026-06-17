import { Receipt } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TransactionsKpiProps {
  thisMonth: number;
  lastMonth: number;
}

export function TransactionsKpi({ thisMonth, lastMonth }: TransactionsKpiProps) {
  const delta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
  const isUp = (delta ?? 0) >= 0;
  const formattedDelta = delta === null ? "—" : `${isUp ? "+" : ""}${delta.toFixed(1)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <Receipt className="size-5" />
            </span>
            Transactions
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="font-semibold text-2xl tabular-nums">{thisMonth.toLocaleString()}</p>
          <p className="text-muted-foreground text-xs">This month</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">vs last month</span>
          <span className="font-medium text-xs tabular-nums">{formattedDelta}</span>
        </div>
      </CardContent>
    </Card>
  );
}
