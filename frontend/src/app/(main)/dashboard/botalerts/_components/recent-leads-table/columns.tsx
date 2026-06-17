"use client";
"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { Copy, EllipsisVertical } from "lucide-react";
import { useRouter } from "next/navigation"; // <-- Add this

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { TableDataRow } from "./schema";

// Helper component for actions to use hooks
const ActionCell = ({ row }: { row: any }) => {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="flex size-8 text-muted-foreground">
          <EllipsisVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuGroup>
          {/* Navigate to the dedicated edit page using the user's ID */}
          <DropdownMenuItem onClick={() => router.push(`/dashboard/botalerts/edit/${row.original.id}`)}>
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<TableDataRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <span className="tabular-nums">{row.original.id}</span>,
    enableHiding: false,
  },
  {
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) => {
      const keyStr = row.original.key;
      return (
        <div className="flex items-center gap-2">
          <span className="block max-w-[80px] truncate font-mono text-muted-foreground sm:max-w-[150px] md:max-w-[200px]">
            {keyStr}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => navigator.clipboard.writeText(keyStr)}
            title="Copy Key"
          >
            <Copy className="h-3 w-3" />
            <span className="sr-only">Copy Key</span>
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => <span className="h-6 w-6 text-muted-foreground hover:text-foreground">{row.original.user}</span>,
  },
  {
    accessorKey: "telegramId",
    header: "Telegram ID",
    cell: ({ row }) => <span className="font-medium text-muted-foreground">{row.original.telegramId}</span>,
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ row }) => row.original.model,
  },
  {
    accessorKey: "expiry",
    header: "Expiry",
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.expiry}</span>,
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell row={row} />, 
    enableHiding: false,
  },
];
