"use client";

import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export interface SalesByProductData {
  academy: number;
  indicators: number;
  bots: number;
}

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
} as const;

export function SalesByProductChart({ data }: { data: SalesByProductData }) {
  const chartData = [
    { product: "academy", sales: data.academy, fill: chartConfig.academy.color },
    { product: "indicators", sales: data.indicators, fill: chartConfig.indicators.color },
    { product: "bots", sales: data.bots, fill: chartConfig.bots.color },
  ].filter((d) => d.sales > 0);

  const totalSales = chartData.reduce((acc, curr) => acc + curr.sales, 0);
  const hasData = totalSales > 0;

  return (
    <Card className="@container/card flex flex-col">
      <CardHeader>
        <CardTitle>Sales by Product</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center gap-4">
        {hasData ? (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-56 w-full">
              <PieChart
                className="m-0"
                margin={{
                  top: 0,
                  right: 0,
                  left: 0,
                  bottom: 0,
                }}
              >
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="sales"
                  nameKey="product"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={2}
                  cornerRadius={4}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground font-bold text-3xl tabular-nums"
                            >
                              {totalSales.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Sales
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {chartData.map((item) => (
                <li key={item.product} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: item.fill }}
                  />
                  <span className="text-xs capitalize">
                    {chartConfig[item.product as keyof typeof chartConfig].label}
                  </span>
                  <span className="text-xs tabular-nums">{item.sales.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
            <p className="font-medium text-sm">No sales data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
