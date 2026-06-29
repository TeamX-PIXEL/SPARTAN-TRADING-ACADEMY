"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Pencil, Filter, Download } from "lucide-react";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/utils";

import { SECTION_LABELS } from "../../_lib/derive-payments";
import type { Payment } from "./schema";
import { DataTable } from "./table";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface TransactionRow {
  id: string;
  date: string;
  section: string;
  customer: string;
  item: string | null;
  amount: number;
  method: string | null;
  status: string;
  settlement_date: string | null;
  address: string | null;
  country: string | null;
  pincode: string | null;
  username: string;
}

function mapTransactions(rows: TransactionRow[]): Payment[] {
  return rows.map((t) => ({
    id: t.id,
    date: t.date,
    section: t.section as Payment["section"],
    customer: t.customer,
    item: t.item ?? "—",
    amount: t.amount,
    status: t.status as Payment["status"],
    method: (t.method ?? "Other") as Payment["method"],
    settlement_date: t.settlement_date,
    address: t.address,
    country: t.country,
    pincode: t.pincode,
    username: t.username,
  }));
}

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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "MMM d, yyyy");
}

function SettlementDateEditor({ payment }: { payment: Payment }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { data: session } = useSession();

  const current = payment.settlement_date ? parseISO(payment.settlement_date) : undefined;

  async function handleSelect(date: Date | undefined) {
    if (!date) return;
    setSaving(true);
    try {
      const token = (session as { accessToken?: string } | null | undefined)?.accessToken;
      await fetch(`${API_URL}/api/admin/transactions/${payment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ settlement_date: date.toISOString() }),
      });
    } catch {
      // ignore
    }
    setSaving(false);
    setOpen(false);
    window.location.reload();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap"
          disabled={saving}
        >
          {payment.settlement_date ? formatDate(payment.settlement_date) : "—"}
          <Pencil className="size-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={current}
          onSelect={handleSelect}
          disabled={saving}
        />
      </PopoverContent>
    </Popover>
  );
}

const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.date)}</span>,
  },
  {
    accessorKey: "settlement_date",
    header: "Settlement Date",
    cell: ({ row }) => <SettlementDateEditor payment={row.original} />,
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
  const [unsettledOnly, setUnsettledOnly] = React.useState(false);
  const [filteredData, setFilteredData] = React.useState<Payment[]>(data);
  const [loading, setLoading] = React.useState(false);
  const [dateRangeOpen, setDateRangeOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const { data: session } = useSession();

  const fetchUnsettled = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = (session as { accessToken?: string } | null | undefined)?.accessToken;
      const res = await fetch(`${API_URL}/api/admin/transactions?unsettled=true`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const rows: TransactionRow[] = await res.json();
        setFilteredData(mapTransactions(rows));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [session]);

  React.useEffect(() => {
    if (unsettledOnly) {
      fetchUnsettled();
    } else {
      setFilteredData(data);
    }
  }, [unsettledOnly, data, fetchUnsettled]);

  function downloadCSV(rows: Record<string, unknown>[], filename: string) {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = (row as Record<string, unknown>)[h] ?? "";
            const str = String(val);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCurrentMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    handleExportRange(start, end);
  }

  function handleExportLastMonth() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    handleExportRange(start, end);
  }

  function handleExportCustom() {
    if (!startDate || !endDate) return;
    handleExportRange(new Date(startDate + "T00:00:00"), new Date(endDate + "T23:59:59"));
    setDateRangeOpen(false);
    setStartDate("");
    setEndDate("");
  }

  function handleExportRange(start: Date, end: Date) {
    const rows = filteredData
      .filter((p) => p.settlement_date)
      .filter((p) => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      })
      .map((p) => ({
        Date: formatDate(p.date),
        "Settlement Date": formatDate(p.settlement_date!),
        Section: SECTION_LABELS[p.section] ?? p.section,
        Customer: p.customer,
        Item: p.item,
        Method: p.method,
        Amount: p.amount,
        Status: p.status,
        Address: p.address ?? "",
        Country: p.country ?? "",
        Pincode: p.pincode ?? "",
      }));
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    downloadCSV(rows, `transactions-${startStr}_to_${endStr}.csv`);
  }

  const exportRows = React.useMemo(() => {
    return filteredData
      .filter((p) => p.settlement_date)
      .map((p) => ({
        Date: formatDate(p.date),
        "Settlement Date": formatDate(p.settlement_date!),
        Section: SECTION_LABELS[p.section] ?? p.section,
        Customer: p.customer,
        Item: p.item,
        Method: p.method,
        Amount: p.amount,
        Status: p.status,
        Address: p.address ?? "",
        Country: p.country ?? "",
        Pincode: p.pincode ?? "",
      }));
  }, [filteredData]);

  return (
    <DataTable
      title="Payment History"
      description={
        filteredData.length === 0
          ? "No payments to display yet — buyer activity from courses, indicators, and bot alerts will appear here."
          : `Showing ${filteredData.length} most recent payment${filteredData.length === 1 ? "" : "s"} across Courses, Indicators, and Bots.`
      }
      columns={columns}
      data={filteredData}
      headerAction={
        <div className="flex items-center gap-2">
          <Button
            variant={unsettledOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnsettledOnly(!unsettledOnly)}
            disabled={loading}
          >
            <Filter className="mr-1.5 size-3.5" />
            {unsettledOnly ? "Showing: Unsettled" : "Unsettled Only"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2 sm:px-3" disabled={exportRows.length === 0}>
                <Download className="sm:mr-2 size-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadCSV(exportRows, "all-transactions.csv")}>
                All Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCurrentMonth}>
                Current Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportLastMonth}>
                Last Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRangeOpen(true)}>
                Custom Date Range...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Select Date Range</DialogTitle>
                <DialogDescription>Pick a start and end date to export transactions as CSV.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleExportCustom} disabled={!startDate || !endDate}>
                  Download CSV
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    />
  );
}
