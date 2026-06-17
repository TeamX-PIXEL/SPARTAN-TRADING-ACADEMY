"use client";
"use no memo";

import Link from "next/link";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, EllipsisVertical, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { IndicatorRow, PurchaserRow } from "./schema";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// --- INDICATORS COLUMNS ---
export const indicatorColumns: ColumnDef<IndicatorRow>[] = [
  // Backend returns 'id' as integer
  {
    accessorKey: "id",
    header: "Ref ID",
    cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.id}</span>,
  },
  {
    id: "thumbnail",
    header: "Thumbnail",
    cell: ({ row }) => {
      const imgSrc = row.original.showcase_image
        ? row.original.showcase_image.startsWith("http")
          ? row.original.showcase_image
          : `${API_BASE}${row.original.showcase_image}`
        : null;

      return (
        <div className="flex items-center justify-center">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={row.original.indicator_name}
              className="h-10 w-10 rounded-md object-cover border"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-muted border flex items-center justify-center text-[10px] text-muted-foreground">
              No img
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "indicator",
    header: "Indicator Name",
    cell: ({ row }) => <span className="font-medium">{row.original.indicator_name}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="block max-w-[200px] truncate text-muted-foreground">{row.original.indicator_description}</span>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => <span className="tabular-nums">₹{row.original.indicator_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;

      return (
        <Badge variant="outline" className="gap-1.5 px-1.5 py-0.5 text-muted-foreground">
          {status === "running" && <span className="size-2 rounded-full bg-green-500" />}
          {status === "paused" && <span className="size-2 rounded-full bg-yellow-500" />}
          {status === "unavailable" && <span className="size-2 rounded-full bg-red-500" />}
          <span className="capitalize">{status}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "buyers",
    header: "Purchased",
    cell: ({ row }) => <span className="tabular-nums">{row.original.buyers}</span>,
  },
  {
    accessorKey: "expiry_period",
    header: "Expiry Period",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.expiry_period || "—"}</span>,
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as any;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex size-8 text-muted-foreground">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => meta?.onEditIndicator?.(row.original)}>
                <Edit2 className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/indicators/${row.original.id}/participants`}>
                  <Users className="mr-2 size-4" />
                  Purchased
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* Added onClick for Delete */}
              <DropdownMenuItem
                onClick={() => meta?.onDeleteIndicator?.(row.original)}
                variant="destructive"
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableHiding: false,
  },
];

// ... (Keep purchaserColumns identical to your previous version)
export const purchaserColumns: ColumnDef<PurchaserRow>[] = [
  // ... your existing purchaser columns code ...
];
