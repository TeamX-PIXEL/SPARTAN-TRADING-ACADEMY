import { Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ThisMonthRevenueProps {
  amount: number;
  transactionCount: number;
  monthOverMonthChange: number | null;
}

export function ThisMonthRevenue({ amount, transactionCount, monthOverMonthChange }: ThisMonthRevenueProps) {
  const change = monthOverMonthChange;
  const isUp = (change ?? 0) >= 0;
  const formattedChange = change === null ? "—" : `${isUp ? "+" : ""}${change.toFixed(1)}%`;
  const variant = change === null ? "outline" : isUp ? "default" : "destructive";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <Wallet className="size-5" />
            </span>
            This Month
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="font-semibold text-2xl tabular-nums">{formatCurrency(amount, { noDecimals: true })}</p>
          <p className="text-muted-foreground text-xs">
            {transactionCount} transaction{transactionCount === 1 ? "" : "s"} this month
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">vs last month</span>
          <Badge variant={variant}>{formattedChange}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
