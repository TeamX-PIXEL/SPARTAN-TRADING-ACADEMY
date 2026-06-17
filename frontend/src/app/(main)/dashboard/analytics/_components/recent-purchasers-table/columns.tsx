"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";

import type { RecentPurchaserRow } from "./schema";
import { DataTable } from "./table";

interface RecentPurchasersTableProps {
  data: RecentPurchaserRow[];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = parseISO(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, "MMM d, yyyy");
}

const columns: ColumnDef<RecentPurchaserRow>[] = [
  {
    accessorKey: "username",
    header: "User",
    cell: ({ row }) => <span className="font-medium">{row.original.username || "—"}</span>,
  },
  {
    accessorKey: "productName",
    header: "Indicator",
    cell: ({ row }) => (
      <span className="max-w-[180px] truncate inline-block align-middle">{row.original.productName}</span>
    ),
  },
  {
    accessorKey: "purchasedAt",
    header: "Purchased",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{formatDate(row.original.purchasedAt)}</span>
    ),
  },
  {
    accessorKey: "subscription",
    header: "Plan",
    cell: ({ row }) => <Badge variant="outline">{row.original.subscription}</Badge>,
  },
  {
    accessorKey: "accessStatus",
    header: "Access",
    cell: ({ row }) => {
      const status = row.original.accessStatus;
      const variant = status === "Approved" ? "default" : status === "Declined" ? "destructive" : "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.expiresAt)}</span>,
  },
];

export function RecentPurchasersTable({ data }: RecentPurchasersTableProps) {
  return (
    <DataTable
      title="Recent Indicator Purchasers"
      description={
        data.length === 0
          ? "No purchases recorded yet — wire a purchaser endpoint on FastAPI to populate this list."
          : `Latest ${data.length} purchaser${data.length === 1 ? "" : "s"} across all indicators.`
      }
      columns={columns}
      data={data}
    />
  );
}
