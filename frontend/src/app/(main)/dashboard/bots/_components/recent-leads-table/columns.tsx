"use client";

import * as React from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, Trash } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { BotRow } from "./schema";

interface BotColumnsProps {
  onEdit: (bot: BotRow) => void;
  onDelete: (bot: BotRow) => void;
}

export const getBotColumns = ({ onEdit, onDelete }: BotColumnsProps): ColumnDef<BotRow, any>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <span className="font-medium">{row.original.id}</span>,
  },
  {
    accessorKey: "thumbnail",
    header: "Thumbnail",
    cell: ({ row }) =>
      row.original.thumbnail ? (
        <img src={row.original.thumbnail} alt={row.original.bot_name} className="h-10 w-10 rounded-md object-cover border" />
      ) : (
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">N/A</div>
      ),
  },
  {
    accessorKey: "bot_name",
    header: "Bot Name",
    cell: ({ row }) => <span className="font-medium">{row.original.bot_name}</span>,
  },
  {
    accessorKey: "display_name",
    header: "Display Name",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate text-muted-foreground text-sm" title={row.original.description || ""}>
        {row.original.description || "—"}
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(row.original.price || 0);
      return <span className="tabular-nums">{formatted}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const color =
        status === "active"
          ? "bg-green-100 text-green-800 border-green-200"
          : status === "paused"
            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
            : "bg-red-100 text-red-800 border-red-200";
      return (
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${color}`}>
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const bot = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(bot)}>
              <Edit className="mr-2 size-4" />
              Edit Bot
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(bot)}>
              <Trash className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
