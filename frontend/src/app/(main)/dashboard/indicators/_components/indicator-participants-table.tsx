"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { IndicatorUserRow } from "./indicator-participants-schema";

const columns: ColumnDef<IndicatorUserRow>[] = [
  {
    accessorKey: "user_id",
    header: "User ID",
    cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.user_id}</span>,
  },
  {
    accessorKey: "user_name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.user_name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  {
    accessorKey: "expiry",
    header: "Expiry Date",
    cell: ({ row }) => {
      const expiry = row.original.expiry;
      if (!expiry) return <span className="font-medium text-green-600">Lifetime</span>;

      const date = new Date(expiry);
      const now = new Date();
      const isExpired = date < now;

      return (
        <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {isExpired && <span className="ml-1 text-xs">(Expired)</span>}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Purchased",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <span className="text-muted-foreground">
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      );
    },
  },
];

export function IndicatorParticipantsTable({ data }: { data: IndicatorUserRow[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          Participants &mdash; {data.length} user{data.length !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No participants found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
