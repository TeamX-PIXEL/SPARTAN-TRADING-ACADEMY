"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { differenceInCalendarDays, format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";

import type { ExpiringSubscriptionRow } from "./schema";
import { DataTable } from "./table";

interface ExpiringSubscriptionsTableProps {
  data: ExpiringSubscriptionRow[];
}

function formatDate(value: string) {
  const d = parseISO(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "MMM d, yyyy");
}

const columns: ColumnDef<ExpiringSubscriptionRow>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium leading-tight">{row.original.user}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{row.original.telegramId}</span>
      </div>
    ),
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ row }) => <Badge variant="secondary">{row.original.model}</Badge>,
  },
  {
    accessorKey: "expiry",
    header: "Expires",
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.expiry)}</span>,
  },
  {
    accessorKey: "daysRemaining",
    header: "Days Left",
    cell: ({ row }) => {
      const days = row.original.daysRemaining;
      const variant = days < 0 ? "destructive" : days <= 3 ? "destructive" : days <= 7 ? "destructive" : "outline";
      const label = days < 0 ? "Expired" : `${days} day${days === 1 ? "" : "s"}`;
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
];

export function ExpiringSubscriptionsTable({ data }: ExpiringSubscriptionsTableProps) {
  const today = new Date();
  const enriched = data
    .map((row) => {
      const expiryDate = parseISO(row.expiry);
      const days = Number.isNaN(expiryDate.getTime()) ? 999 : differenceInCalendarDays(expiryDate, today);
      return { ...row, daysRemaining: days };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <DataTable
      title="Expiring Bot Subscriptions"
      description={
        enriched.length === 0
          ? "No active bot subscriptions found. Add a bot user to see renewals here."
          : `Showing ${enriched.length} subscription${enriched.length === 1 ? "" : "s"} sorted by days remaining.`
      }
      columns={columns}
      data={enriched}
    />
  );
}
