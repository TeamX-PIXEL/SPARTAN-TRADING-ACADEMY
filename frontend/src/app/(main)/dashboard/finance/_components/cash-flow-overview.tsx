"use client";

import { ArrowDownLeft, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";

const chartData = [
  { month: "Jan", revenue: 24200 },
  { month: "Feb", revenue: 28500 },
  { month: "Mar", revenue: 35600 },
  { month: "Apr", revenue: 31200 },
  { month: "May", revenue: 42380 },
  { month: "Jun", revenue: 39800 },
  { month: "Jul", revenue: 36400 },
  { month: "Aug", revenue: 41500 },
  { month: "Sep", revenue: 38700 },
  { month: "Oct", revenue: 44900 },
  { month: "Nov", revenue: 40200 },
  { month: "Dec", revenue: 47100 },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} as ChartConfig;

export function CashFlowOverview() {
  const totalRevenue = chartData.reduce((acc, item) => acc + item.revenue, 0);
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue));
  const bestMonth = chartData.find((d) => d.revenue === maxRevenue);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Monthly client deposits and transfer volume.</CardDescription>
        <CardAction>
          <Select defaultValue="this-year">
            <SelectTrigger size="sm" className="w-37">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Separator />
        <div className="flex items-start justify-between gap-2 py-5 md:items-stretch md:gap-0">
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-1">
              <ArrowDownLeft className="size-6 stroke-background" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Total Revenue</p>
              <p className="font-medium tabular-nums">{formatCurrency(totalRevenue, { noDecimals: true })}</p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-auto! self-stretch" />
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-1/70">
              <TrendingUp className="size-6 stroke-background" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Best Month</p>
              <p className="font-medium tabular-nums">
                {bestMonth?.month} · {formatCurrency(bestMonth?.revenue ?? 0, { noDecimals: true })}
              </p>
            </div>
          </div>
        </div>
        <Separator />
        <ChartContainer className="max-h-72 w-full" config={chartConfig}>
          <BarChart margin={{ left: -25, right: 0, top: 25, bottom: 0 }} accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : `${value}`)}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="revenue" fill={chartConfig.revenue.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
