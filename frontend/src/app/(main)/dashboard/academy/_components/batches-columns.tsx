"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Circle, Clock, Edit, EllipsisVertical, Trash, Users } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

import type { BatchRow } from "./batches-schema";

const ActionCell = ({ row }: { row: { original: BatchRow } }) => {
  const pathname = usePathname();
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Form State
  const [startDate, setStartDate] = React.useState(
    row.original.rawStartDate ? new Date(row.original.rawStartDate).toISOString().slice(0, 16) : "",
  );
  const [maxDays, setMaxDays] = React.useState(row.original.maxDays?.toString() || "30");
  const [status, setStatus] = React.useState(row.original.status || "scheduled");

  const primaryId = row.original.id || row.original.batchId;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/batches/${primaryId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleteOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting batch", error);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/batches/${primaryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_start_date: new Date(startDate).toISOString(),
          max_days: parseInt(maxDays, 10),
          status,
        }),
      });

      if (res.ok) {
        setIsEditOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating batch", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Edit className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`${pathname}/${primaryId}`}>
              <CalendarClock className="mr-2 size-4" />
              Schedule
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`${pathname}/${primaryId}/participants`}>
              <Users className="mr-2 size-4" />
              Participants
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setIsDeleteOpen(true);
            }}
          >
            <Trash className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>Update the start date or duration for {row.original.batchName}.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-start-${primaryId}`}>Start Date & Time</Label>
              <Input
                id={`edit-start-${primaryId}`}
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-max-${primaryId}`}>Duration (Max Days)</Label>
              <Input
                id={`edit-max-${primaryId}`}
                type="number"
                value={maxDays}
                onChange={(e) => setMaxDays(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-status-${primaryId}`}>Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as "enrolling" | "scheduled")}>
                <SelectTrigger id={`edit-status-${primaryId}`}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrolling">Enrolling</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{row.original.batchName}</span>? This will also remove all
              schedules and participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

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
    accessorKey: "participants",
    // 1. Wrap the header in a centered div
    header: () => <div className="text-center">Participants</div>,
    // 2. Wrap the cell content in a centered div
    cell: ({ row }) => <div className="text-center text-muted-foreground">{row.original.participants}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;

      if (status === "enrolling") {
        return (
          <Badge
            variant="outline"
            className="gap-1.5 border-green-200 px-1.5 py-0.5 text-green-600 dark:border-green-800 dark:text-green-400"
          >
            <Circle className="size-2.5 fill-green-500 text-green-500" />
            Enrolling
          </Badge>
        );
      }

      return (
        <Badge variant="outline" className="gap-1.5 px-1.5 py-0.5 text-muted-foreground">
          <Clock className="size-3.5" />
          Scheduled
        </Badge>
      );
    },
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const scheduled = row.original.progress?.scheduled ?? 0;
      const total = row.original.progress?.total ?? 0;
      const percentage = total > 0 ? (scheduled / total) * 100 : 0;

      return (
        <div className="flex w-[120px] flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {scheduled}/{total} Scheduled
            </span>
            <span>{Math.round(percentage)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell row={row} />,
  },
];
