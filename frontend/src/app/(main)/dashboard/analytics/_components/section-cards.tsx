import { ArrowDown, ArrowUp, Bot, ShoppingBag, UserPlus, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface OverviewParticipatedCourse {
  course_id: number;
  course_title: string;
  this_month: number;
  prev_month: number;
}

export interface OverviewStats {
  new_signups: { this_month: number; prev_month: number };
  active_users: { this_month: number; prev_month: number };
  products_sold: {
    this_month: number;
    prev_month: number;
    breakdown_this_month: { courses: number; indicators: number; bots: number };
    breakdown_prev_month: { courses: number; indicators: number; bots: number };
  };
  participated_users: {
    this_month: number;
    prev_month: number;
    breakdown: OverviewParticipatedCourse[];
  };
  month_label: string;
  prev_month_label: string;
}

interface SectionCardsProps {
  stats: OverviewStats;
}

const intFormatter = new Intl.NumberFormat("en-US");

function formatDelta(current: number, previous: number): { text: string; trend: "up" | "down" | "flat" } {
  const diff = current - previous;
  if (diff === 0) return { text: "0", trend: "flat" };
  return { text: `${diff > 0 ? "+" : ""}${intFormatter.format(diff)}`, trend: diff > 0 ? "up" : "down" };
}

function TrendPill({ current, previous }: { current: number; previous: number }) {
  const { text, trend } = formatDelta(current, previous);
  if (trend === "flat") {
    return (
      <Badge variant="secondary">
        <span className="tabular-nums">{intFormatter.format(previous)}</span> last month
      </Badge>
    );
  }
  const Icon = trend === "up" ? ArrowUp : ArrowDown;
  return (
    <Badge variant={trend === "up" ? "default" : "destructive"}>
      <Icon />
      <span className="tabular-nums">{text}</span> vs{" "}
      <span className="tabular-nums">{intFormatter.format(previous)}</span>
    </Badge>
  );
}

function ProductsBreakdown({ breakdown }: { breakdown: { courses: number; indicators: number; bots: number } }) {
  const total = breakdown.courses + breakdown.indicators + breakdown.bots;
  if (total === 0) {
    return <div className="text-muted-foreground text-xs">No sales recorded</div>;
  }
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
      <span>
        <span className="font-medium text-foreground tabular-nums">{breakdown.courses}</span> courses
      </span>
      <span>
        <span className="font-medium text-foreground tabular-nums">{breakdown.indicators}</span> indicators
      </span>
      <span>
        <span className="font-medium text-foreground tabular-nums">{breakdown.bots}</span> bots
      </span>
    </div>
  );
}

function ParticipatedBreakdown({ items, prevLabel }: { items: OverviewParticipatedCourse[]; prevLabel: string }) {
  if (items.length === 0) {
    return <div className="text-muted-foreground text-xs">No participation recorded</div>;
  }
  return (
    <ul className="flex flex-col gap-0.5 text-xs">
      {items.slice(0, 3).map((item) => (
        <li key={item.course_id} className="flex items-center gap-2 text-muted-foreground">
          <span className="truncate font-medium text-foreground">{item.course_title}</span>
          <span className="ml-auto tabular-nums">
            {intFormatter.format(item.this_month)} this · {intFormatter.format(item.prev_month)} {prevLabel}
          </span>
        </li>
      ))}
      {items.length > 3 && <li className="text-[11px] text-muted-foreground">+{items.length - 3} more</li>}
    </ul>
  );
}

export function SectionCards({ stats }: SectionCardsProps) {
  return (
    <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <UserPlus className="size-4" />
            New Signups
          </CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {intFormatter.format(stats.new_signups.this_month)}
          </CardTitle>
          <TrendPill current={stats.new_signups.this_month} previous={stats.new_signups.prev_month} />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="font-medium">Accounts created in {stats.month_label}</div>
          <div className="text-muted-foreground text-xs">
            Previous: <span className="tabular-nums">{intFormatter.format(stats.new_signups.prev_month)}</span> in{" "}
            {stats.prev_month_label}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <UsersRound className="size-4" />
            Active Users
          </CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {intFormatter.format(stats.active_users.this_month)}
          </CardTitle>
          <TrendPill current={stats.active_users.this_month} previous={stats.active_users.prev_month} />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="font-medium">Signed in during {stats.month_label}</div>
          <div className="text-muted-foreground text-xs">
            Previous: <span className="tabular-nums">{intFormatter.format(stats.active_users.prev_month)}</span> in{" "}
            {stats.prev_month_label}
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <ShoppingBag className="size-4" />
            Products Sold
          </CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {intFormatter.format(stats.products_sold.this_month)}
          </CardTitle>
          <TrendPill current={stats.products_sold.this_month} previous={stats.products_sold.prev_month} />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <ProductsBreakdown breakdown={stats.products_sold.breakdown_this_month} />
          <div className="text-muted-foreground text-xs">
            {stats.prev_month_label}: courses{" "}
            <span className="tabular-nums">{stats.products_sold.breakdown_prev_month.courses}</span>, indicators{" "}
            <span className="tabular-nums">{stats.products_sold.breakdown_prev_month.indicators}</span>, bots{" "}
            <span className="tabular-nums">{stats.products_sold.breakdown_prev_month.bots}</span>
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Bot className="size-4" />
            Participated Users
          </CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {intFormatter.format(stats.participated_users.this_month)}
          </CardTitle>
          <TrendPill current={stats.participated_users.this_month} previous={stats.participated_users.prev_month} />
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <ParticipatedBreakdown items={stats.participated_users.breakdown} prevLabel={stats.prev_month_label} />
        </CardFooter>
      </Card>
    </div>
  );
}
