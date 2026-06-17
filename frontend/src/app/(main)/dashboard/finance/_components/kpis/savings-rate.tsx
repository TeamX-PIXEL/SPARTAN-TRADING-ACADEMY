"use client";

import { ArrowRightLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

export function SavingsRate() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <ArrowRightLeft className="size-5" />
            </span>
            Avg. Transfer
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <p className="font-medium text-xl tabular-nums">{formatCurrency(1840, { noDecimals: true })}</p>
            <span className="text-xs text-emerald-500">+5.2% MoM</span>
          </div>
          <p className="text-muted-foreground text-xs">Per client deposit</p>
        </div>
        <Separator />
        <p className="text-muted-foreground text-xs">Based on last 30 days</p>
      </CardContent>
    </Card>
  );
}
