"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const revenues = [
  { key: "forex", label: "Forex", amount: 98200 },
  { key: "crypto", label: "Crypto", amount: 76400 },
  { key: "commodities", label: "Commodities", amount: 62300 },
  { key: "managed", label: "Managed Accounts", amount: 48900 },
  { key: "signals", label: "Trade Signals", amount: 35100 },
  { key: "indices", label: "Indices", amount: 28600 },
  { key: "stocks", label: "Stocks", amount: 22300 },
];

export function SpendingBreakdown() {
  const total = revenues.reduce((sum, item) => sum + item.amount, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Product</CardTitle>
        <CardDescription>Income distribution by product category.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="font-medium text-2xl">{formatCurrency(total, { noDecimals: true })}</div>
          <div className="flex h-6 w-full overflow-hidden rounded-md">
            {revenues.map((item, index) => {
              const width = (item.amount / total) * 100;
              const alpha = Math.max(0.35, 1 - index * 0.08);

              return (
                <div
                  key={item.key}
                  className="h-full shrink-0 border-background border-l first:border-l-0"
                  style={{
                    width: `${width}%`,
                    background: `color-mix(in oklch, var(--primary) ${alpha * 100}%, transparent)`,
                  }}
                  title={`${item.label}: ${formatCurrency(item.amount)}`}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {revenues.map((item, index) => {
            const pct = Math.round((item.amount / total) * 100);
            const alpha = Math.max(0.35, 1 - index * 0.08);

            return (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-sm"
                    style={{
                      background: `color-mix(in oklch, var(--primary) ${alpha * 100}%, transparent)`,
                    }}
                  />
                  <span className="text-muted-foreground text-sm">{item.label}</span>
                </div>
                <span className="font-medium text-sm tabular-nums">{formatCurrency(item.amount, { noDecimals: true })}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
