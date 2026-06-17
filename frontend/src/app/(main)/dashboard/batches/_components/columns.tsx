"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { BatchRow } from "./schema";

export const batchColumns: ColumnDef<BatchRow>[] = [
  {
    accessorKey: "batchId",
    header: "Batch ID",
    cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.batchId}</span>,
  },
  {
    accessorKey: "batchName",
    header: "Batch Name",
    cell: ({ row }) => <span className="font-medium">{row.original.batchName}</span>,
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.startDate}</span>,
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.endDate}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge 
          variant={status === "Finished" ? "outline" : status === "In Progress" ? "default" : "secondary"}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {row.original.chaptersFinished} / {row.original.totalChapters}
      </span>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>View Chapters</DropdownMenuItem>
            <DropdownMenuItem>Edit Batch</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
