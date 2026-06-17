"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

const topClients = [
  { name: "Vertex Capital Ltd", amount: 48750, products: "Forex · Managed" },
  { name: "Atlas Trading Group", amount: 39200, products: "Crypto" },
  { name: "Meridian Investments", amount: 31800, products: "Commodities · Indices" },
  { name: "Zenith Holdings LLC", amount: 26400, products: "Signals · Stocks" },
  { name: "Pinnacle Trade Co", amount: 22380, products: "Forex · Crypto" },
];

export function IncomeReliability() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Clients</CardTitle>
        <CardDescription>Highest revenue clients by transfer volume.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />
        {topClients.map((client, i) => (
          <div key={i}>
            <div className="flex justify-between">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">{client.name}</p>
                <p className="text-muted-foreground text-xs">{client.products}</p>
              </div>
              <p className="font-medium text-sm tabular-nums">{formatCurrency(client.amount, { noDecimals: true })}</p>
            </div>
            {i < topClients.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
        <Separator />
        <p className="text-muted-foreground text-xs">
          Total from top 5: <span className="font-medium text-primary">{formatCurrency(168530, { noDecimals: true })}</span>
        </p>
      </CardContent>
    </Card>
  );
}
