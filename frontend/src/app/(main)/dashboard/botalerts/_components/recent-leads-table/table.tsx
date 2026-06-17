"use client";
"use no memo";

import * as React from "react";

import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Settings2,
  UserPlus,
  User,     // <-- Added for Username icon
  Key,      // <-- Added for Key icon
  Send      // <-- Using for Telegram ID icon
} from "lucide-react";
import Link from "next/link"; 


import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { columns } from "./columns";
import type { TableDataRow } from "./schema";

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  key: "Key",
  user: "User",
  telegramId: "Telegram ID",
  model: "Model",
  expiry: "Expiry",
};


export function DataTable({ data }: { data: TableDataRow[] }) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // --- NEW STATE: Track which column we are actively searching ---
  const [searchColumn, setSearchColumn] = React.useState<"user" | "telegramId" | "key">("user");

  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // --- HANDLER: Switch search column and clear old text ---
  const handleSearchColumnChange = (newCol: "user" | "telegramId" | "key") => {
    // Clear the filter of the PREVIOUS column so we don't accidentally hide all rows
    table.getColumn(searchColumn)?.setFilterValue("");
    setSearchColumn(newCol);
  };

  // --- HELPER: Determine which icon and placeholder to show ---
  const getSearchConfig = () => {
    switch (searchColumn) {
      case "key": return { icon: Key, placeholder: "Search License Keys..." };
      case "telegramId": return { icon: Send, placeholder: "Search Telegram IDs..." };
      case "user":
      default: return { icon: User, placeholder: "Search Usernames..." };
    }
  };

  const SearchIcon = getSearchConfig().icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Bot Access</CardTitle>
        <CardDescription>Manage your users, their keys, and bot models.</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 data-icon="inline-start" className="mr-2 h-4 w-4" />
                  View
                  <ChevronDownIcon data-icon="inline-end" className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {table
                    .getAllColumns()
                    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {COLUMN_LABELS[column.id] ?? column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/dashboard/botalerts/add">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <UserPlus data-icon="inline-start" className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add User</span>
              </Button>
            </Link>

          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          
          {/* --- UPDATED: Search Input with Dropdown Icon Selector --- */}
          <div className="flex w-full max-w-sm items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-r-none mr-2 border-r-0 px-3 bg-muted/20 hover:bg-muted/50 focus-visible:z-20"
                  title="Select search type"
                >
                  <SearchIcon className="h-4 w-4 text-muted-foreground" />

                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => handleSearchColumnChange("user")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Username
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSearchColumnChange("telegramId")} className="cursor-pointer">
                  <Send className="mr-2 h-4 w-4" />
                  Telegram ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSearchColumnChange("key")} className="cursor-pointer">
                  <Key className="mr-2 h-4 w-4" />
                  License Key
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Input
              placeholder={getSearchConfig().placeholder}
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn(searchColumn)?.setFilterValue(event.target.value)}
              className="rounded-l-none focus-visible:z-10 w-full"
            />
          </div>
          {/* --- END UPDATED SECTION --- */}

          <Select
            value={(table.getColumn("model")?.getFilterValue() as string) ?? "all"}
            onValueChange={(value) =>
              table.getColumn("model")?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="Evergreen">Evergreen</SelectItem>
                <SelectItem value="Legacy">Legacy</SelectItem>
                <SelectItem value="Alpha">Alpha</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
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
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 text-muted-foreground text-sm">
            {table.getFilteredRowModel().rows.length} row(s) total.
          </div>
          <div className="flex items-center justify-center gap-8">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="font-medium text-sm">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="font-medium text-sm whitespace-nowrap">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
