"use client";

import * as React from "react";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

export interface RevenuePoint {
  date: string;
  academy: number;
  indicators: number;
  bots: number;
}

interface RevenueByProductChartProps {
  data: RevenuePoint[];
}

const ranges = [
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 3 months", days: 90 },
] as const;

const usdFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const chartConfig = {
  academy: {
    label: "Academy",
    color: "var(--chart-1)",
  },
  indicators: {
    label: "Indicators",
    color: "var(--chart-2)",
  },
  bots: {
    label: "Bot Alerts",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function RevenueByProductChart({ data }: RevenueByProductChartProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<(typeof ranges)[number]["value"]>("30d");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("30d");
    }
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    const range = ranges.find((r) => r.value === timeRange) ?? ranges[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range.days);
    return data.filter((d) => new Date(d.date) >= cutoff);
  }, [data, timeRange]);

  const totals = React.useMemo(() => {
    return filteredData.reduce(
      (acc, point) => ({
        academy: acc.academy + (point.academy ?? 0),
        indicators: acc.indicators + (point.indicators ?? 0),
        bots: acc.bots + (point.bots ?? 0),
      }),
      { academy: 0, indicators: 0, bots: 0 },
    );
  }, [filteredData]);

  const grandTotal = totals.academy + totals.indicators + totals.bots;
  const hasData = filteredData.length > 0 && grandTotal > 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenue by Product Line</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">Academy vs Indicators vs Bot Alerts</span>
          <span className="@[540px]/card:hidden">By product line</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => {
              if (value) setTimeRange(value as (typeof ranges)[number]["value"]);
            }}
            variant="outline"
            className="@[767px]/card:flex hidden *:data-[slot=toggle-group-item]:px-4!"
          >
            {ranges.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as (typeof ranges)[number]["value"])}>
            <SelectTrigger
              className="flex @[767px]/card:hidden w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select a range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectGroup>
                {ranges.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="rounded-lg">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {hasData ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-62 w-full">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillAcademy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-academy)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-academy)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillIndicators" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-indicators)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-indicators)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillBots" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-bots)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-bots)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value as string).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                    indicator="dot"
                    formatter={(value) => usdFormatter.format(Number(value))}
                  />
                }
              />
              <Area dataKey="bots" type="natural" fill="url(#fillBots)" stroke="var(--color-bots)" stackId="a" />
              <Area
                dataKey="indicators"
                type="natural"
                fill="url(#fillIndicators)"
                stroke="var(--color-indicators)"
                stackId="a"
              />
              <Area
                dataKey="academy"
                type="natural"
                fill="url(#fillAcademy)"
                stroke="var(--color-academy)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex aspect-auto h-62 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
            <p className="font-medium text-sm">No revenue data yet</p>
            <p className="max-w-sm text-muted-foreground text-xs">
              Wire a real revenue endpoint (e.g. <code>/api/revenue/timeseries</code>) on your FastAPI backend to
              populate this chart. Until then, totals will default to zero.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
