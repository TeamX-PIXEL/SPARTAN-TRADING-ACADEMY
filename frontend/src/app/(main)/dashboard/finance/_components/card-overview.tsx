"use client";

import { addDays, format } from "date-fns";
import { ArrowDownLeft, Building2, CreditCard, Landmark, Wallet } from "lucide-react";
import { siMastercard, siVisa } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

const now = new Date();

const recentTransfers = [
  {
    id: 1,
    client: "Vertex Capital Ltd",
    amount: 12800,
    method: "Wire Transfer",
    date: format(addDays(now, -1), "do MMMM yyyy"),
  },
  {
    id: 2,
    client: "Atlas Trading Group",
    amount: 9450,
    method: "Crypto Deposit",
    date: format(addDays(now, -2), "do MMMM yyyy"),
  },
  {
    id: 3,
    client: "Meridian Investments",
    amount: 7200,
    method: "Bank Transfer",
    date: format(addDays(now, -3), "do MMMM yyyy"),
  },
  {
    id: 4,
    client: "Pinnacle Trade Co",
    amount: 5100,
    method: "Wire Transfer",
    date: format(addDays(now, -4), "do MMMM yyyy"),
  },
  {
    id: 5,
    client: "Zenith Holdings LLC",
    amount: 4350,
    method: "Crypto Deposit",
    date: format(addDays(now, -5), "do MMMM yyyy"),
  },
];

export function CardOverview() {
  return (
    <Card className="shadow-xs">
      <CardHeader className="items-center">
        <CardTitle>Receiving Card</CardTitle>
        <CardDescription>Primary card where client deposits are settled</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid w-full place-items-center">
            <div className="relative flex aspect-8/5 w-full max-w-100 flex-col justify-between overflow-hidden rounded-xl bg-primary p-6">
              <div className="flex items-start justify-between">
                <SimpleIcon icon={siVisa} className="size-8 fill-primary-foreground sm:size-10" />
                <Landmark className="size-5 text-primary-foreground/70" />
              </div>

              <div className="space-y-1">
                <p className="font-mono text-primary-foreground/90 text-sm tracking-[0.15em] sm:text-lg">
                  •••• •••• •••• 8842
                </p>
              </div>

              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <p className="font-medium font-mono text-primary-foreground text-sm uppercase tracking-wide">
                    Admin Finance
                  </p>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[10px] text-primary-foreground/80 uppercase tracking-wider">Valid Thru</p>
                      <p className="font-mono text-primary-foreground/80 text-xs">09/28</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-primary-foreground/80 uppercase tracking-wider">CVV</p>
                      <p className="font-mono text-primary-foreground/80 text-xs">•••</p>
                    </div>
                  </div>
                </div>
                <SimpleIcon icon={siMastercard} className="size-7 fill-primary-foreground/80 sm:size-10" />
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Account Type</span>
              <span className="font-medium tabular-nums">Business Checking</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bank</span>
              <span className="font-medium tabular-nums">Metro Commercial Bank</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Routing</span>
              <span className="font-medium tabular-nums">021000021</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monthly Inflow</span>
              <span className="font-medium tabular-nums">{formatCurrency(168500, { noDecimals: true })}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Button className="w-full" size="sm">Share Deposit Info</Button>
            <Button className="w-full" variant="outline" size="sm">Manage Card</Button>
          </div>
          <Separator />

          <div className="space-y-4">
            <h6 className="text-muted-foreground text-sm uppercase">Recent Client Deposits</h6>
            <div className="space-y-4">
              {recentTransfers.map((transfer) => (
                <div key={transfer.id} className="flex items-center gap-2">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <ArrowDownLeft className="size-5 text-emerald-500" />
                  </div>
                  <div className="flex w-full items-end justify-between">
                    <div>
                      <p className="font-medium text-sm">{transfer.client}</p>
                      <p className="text-muted-foreground text-xs">
                        {transfer.method} · {transfer.date}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-emerald-600 text-sm tabular-nums leading-none">
                        +{formatCurrency(transfer.amount, { noDecimals: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full" size="sm" variant="outline">
              View All Transfers
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
