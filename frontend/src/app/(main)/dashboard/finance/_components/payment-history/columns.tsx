"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

import { SECTION_LABELS } from "../../_lib/derive-payments";
import type { Payment } from "./schema";
import { DataTable } from "./table";

interface PaymentHistoryTableProps {
  data: Payment[];
}

const SECTION_VARIANTS: Record<Payment["section"], "default" | "secondary" | "outline"> = {
  academy: "default",
  indicators: "secondary",
  bot_alerts: "outline",
};

const STATUS_VARIANTS: Record<Payment["status"], "default" | "secondary" | "destructive"> = {
  completed: "default",
  pending: "secondary",
  refunded: "destructive",
};

function formatDate(value: string) {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "MMM d, yyyy");
}

const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.date)}</span>,
  },
  {
    accessorKey: "section",
    header: "Section",
    cell: ({ row }) => (
      <Badge variant={SECTION_VARIANTS[row.original.section]}>{SECTION_LABELS[row.original.section]}</Badge>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="font-medium max-w-[220px] truncate inline-block align-middle">{row.original.customer}</span>
    ),
  },
  {
    accessorKey: "item",
    header: "Item",
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[260px] truncate inline-block align-middle">
        {row.original.item}
      </span>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {row.original.method}
      </Badge>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{formatCurrency(row.original.amount, { noDecimals: true })}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANTS[row.original.status]}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
];

export function PaymentHistoryTable({ data }: PaymentHistoryTableProps) {
  return (
    <DataTable
      title="Payment History"
      description={
        data.length === 0
          ? "No payments to display yet — buyer activity from courses, indicators, and bot alerts will appear here."
          : `Showing ${data.length} most recent payment${data.length === 1 ? "" : "s"} across Academy, Indicators, and Bot Alerts.`
      }
      columns={columns}
      data={data}
    />
  );
}
