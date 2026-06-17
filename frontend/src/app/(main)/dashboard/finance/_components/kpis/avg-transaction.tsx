import { Coins } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface AvgTransactionKpiProps {
  amount: number;
  totalTransactions: number;
}

export function AvgTransactionKpi({ amount, totalTransactions }: AvgTransactionKpiProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <Coins className="size-5" />
            </span>
            Avg. Transaction
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="font-semibold text-2xl tabular-nums">{formatCurrency(amount, { noDecimals: true })}</p>
          <p className="text-muted-foreground text-xs">Per completed payment</p>
        </div>
        <p className="text-muted-foreground text-xs">
          Across {totalTransactions.toLocaleString()} transaction
          {totalTransactions === 1 ? "" : "s"} this month
        </p>
      </CardContent>
    </Card>
  );
}
