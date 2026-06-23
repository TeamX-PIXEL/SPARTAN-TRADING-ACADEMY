"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

import type { MonthlyRevenuePoint } from "../_lib/derive-payments";

interface MonthlyRevenueChartProps {
  data: MonthlyRevenuePoint[];
}

const chartConfig = {
  academy: {
    label: "Course",
    color: "var(--chart-1)",
  },
  indicators: {
    label: "Indicator",
    color: "var(--chart-2)",
  },
  bot_alerts: {
    label: "Bot",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
        <CardDescription>Last 12 months, grouped by section.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <BarChart data={data} barGap={2} barCategoryGap="22%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(Number(value))
                }
                width={48}
                fontSize={12}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value, name) => (
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <span className="text-muted-foreground capitalize">
                          {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatCurrency(Number(value), { noDecimals: true })}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="academy" stackId="revenue" fill="var(--color-academy)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="indicators" stackId="revenue" fill="var(--color-indicators)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bot_alerts" stackId="revenue" fill="var(--color-bot_alerts)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex aspect-auto h-72 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
            <p className="font-medium text-sm">No revenue recorded in the last 12 months</p>
            <p className="max-w-sm text-muted-foreground text-xs">
              Once your FastAPI backend has active courses, indicators, or bot users with buyers, monthly revenue will
              appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
