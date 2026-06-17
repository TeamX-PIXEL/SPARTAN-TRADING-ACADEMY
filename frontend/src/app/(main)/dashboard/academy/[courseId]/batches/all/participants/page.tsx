"use client";

import * as React from "react";
import Link from "next/link";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowLeft, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

interface WaitlistEntry {
  user_id: number;
  user_name: string;
  user_id_str: string;
  email: string;
  waitlist_batch_id: number;
  created_at: string;
}

interface BatchItem {
  id: number;
  assigned_to: number;
  status: string;
}

interface TemplateData {
  latest_batch: number;
  current_batch: number;
}

function getStatus(entry: WaitlistEntry, batches: BatchItem[], template: TemplateData | null) {
  const batchExists = batches.some((b) => b.assigned_to === entry.waitlist_batch_id);
  if (batchExists) {
    return { label: `Batch #${entry.waitlist_batch_id}`, status: "assigned" as const };
  }

  const latestBatch = template?.latest_batch ?? 0;
  if (entry.waitlist_batch_id === latestBatch + 1) {
    return { label: "Waiting", status: "waiting" as const };
  }

  return { label: "Expired", status: "expired" as const };
}

export default function AllParticipantsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = React.use(params);

  const [entries, setEntries] = React.useState<WaitlistEntry[]>([]);
  const [batches, setBatches] = React.useState<BatchItem[]>([]);
  const [template, setTemplate] = React.useState<TemplateData | null>(null);
  const [courseName, setCourseName] = React.useState(`Course ${courseId}`);
  const [filter, setFilter] = React.useState("all");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!courseId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const [waitlistRes, batchesRes, templateRes, coursesRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${courseId}/waitlist`),
        fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${courseId}/batches`),
        fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${courseId}/template`),
        fetchWithAuth(`${API_BASE_URL}/api/admin/courses`),
      ]);

      if (cancelled) return;

      if (waitlistRes?.ok) setEntries(await waitlistRes.json());
      if (batchesRes?.ok) setBatches(await batchesRes.json());
      if (templateRes?.ok) setTemplate(await templateRes.json());

      if (coursesRes?.ok) {
        const data = await coursesRes.json();
        const courses = data?.courses || data;
        if (Array.isArray(courses)) {
          const found = courses.find((c: any) => c.id.toString() === courseId);
          if (found) setCourseName(found.title);
        }
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const filteredEntries = React.useMemo(() => {
    if (filter === "all") return entries;
    if (filter === "waiting") {
      return entries.filter((e) => getStatus(e, batches, template).status === "waiting");
    }
    // filter is a batch assigned_to value
    const batchAssignedTo = parseInt(filter, 10);
    return entries.filter((e) => e.waitlist_batch_id === batchAssignedTo);
  }, [entries, filter, batches, template]);

  const columns: ColumnDef<WaitlistEntry>[] = [
    {
      accessorKey: "user_name",
      header: "Username",
      cell: ({ row }) => <span className="font-medium">{row.original.user_name}</span>,
    },
    {
      accessorKey: "user_id_str",
      header: "User ID",
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.user_id_str}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: "assigned_to",
      header: "Assigned To",
      cell: ({ row }) => {
        const status = getStatus(row.original, batches, template);
        if (status.status === "waiting") {
          return <span className="text-amber-500 font-medium">{status.label}</span>;
        }
        if (status.status === "expired") {
          return <span className="text-gray-400">{status.label}</span>;
        }
        return <span className="text-blue-600">{status.label}</span>;
      },
    },
  ];

  const table = useReactTable({
    data: filteredEntries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold tracking-tight">Participants</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Participants</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage all participants for {courseName}. Use the dropdown to filter by batch.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="size-8" asChild>
              <Link href={`/dashboard/academy/${courseId}/batches`}>
                <ArrowLeft className="size-4" />
                <span className="sr-only">Back to Batches</span>
              </Link>
            </Button>

            <div className="flex flex-col">
              <CardTitle className="text-l leading-none">Participant Queue</CardTitle>
              <CardDescription className="text-sm mt-0.7">{courseName}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={String(batch.assigned_to)}>
                    B-{batch.assigned_to}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
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
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
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
    </div>
  );
}
