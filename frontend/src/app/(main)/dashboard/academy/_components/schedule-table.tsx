"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";
import { type ScheduleRow, scheduleColumns } from "./schedule-columns";

export type ChapterDropdownItem = {
  id: number;
  title: string;
};

export function ScheduleTable({
  data,
  batchName,
  batchId,
  courseId,
  chapters,
}: {
  data: ScheduleRow[];
  batchName: string;
  batchId: string;
  courseId: string;
  chapters: ChapterDropdownItem[];
}) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [chapterMode, setChapterMode] = React.useState<string>("");
  const [customName, setCustomName] = React.useState(""); // ✅ Added state for the custom text input
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [duration, setDuration] = React.useState("2 Hours");
  const [sessionType, setSessionType] = React.useState("Live");
  const [link, setLink] = React.useState("");

  const table = useReactTable({
    data,
    columns: scheduleColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  async function handleAddSchedule() {
    setIsSubmitting(true);

    // ✅ Logic: Determine whether to send the ID or the Custom Name
    let selectedChapterId: number | null = null;
    let finalCustomName: string | null = null;

    if (chapterMode === "custom") {
      finalCustomName = customName || "Custom Session"; // Fallback if they leave it blank
      selectedChapterId = null; // Send null to the DB
    } else if (chapterMode) {
      selectedChapterId = parseInt(chapterMode);
      finalCustomName = null;
    } else {
      alert("Please select a module.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/batches/${batchId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: parseInt(courseId),
          batch_list_id: parseInt(batchId),
          chapter_id: selectedChapterId,
          custom_chapter_name: finalCustomName,
          scheduled_at: scheduledAt ? scheduledAt + ":00" : null,
          estimated_duration: duration,
          session_type: sessionType.toLowerCase(),
          join_link: link,
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setChapterMode("");
        setCustomName("");
        setScheduledAt("");
        setLink("");
        router.refresh();
      } else {
        const err = await res.json();
        console.error("Failed to add schedule", err);
      }
    } catch (error) {
      console.error("Error API", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl">Batch Schedule</CardTitle>
          <CardDescription>Manage modules and class timings for {batchName}.</CardDescription>
        </div>

        <Button size="sm" className="h-8 gap-1.5" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-3.5" />
          Add Schedule
        </Button>
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
                  <TableCell colSpan={scheduleColumns.length} className="h-24 text-center">
                    No schedules created yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Schedule</DialogTitle>
            <DialogDescription>Create a new class or module schedule for this batch.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Module / Chapter</Label>
              <Select onValueChange={setChapterMode} value={chapterMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chap) => (
                    <SelectItem key={chap.id} value={chap.id.toString()}>
                      {chap.title}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="font-medium text-blue-500">
                    + Add Custom Chapter...
                  </SelectItem>
                </SelectContent>
              </Select>
              {/* ✅ Bind the custom input to the customName state */}
              {chapterMode === "custom" && (
                <Input
                  placeholder="Enter custom chapter name"
                  className="mt-2"
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-datetime">Date & Time</Label>
              <Input
                id="new-datetime"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-duration">Duration</Label>
                <Input
                  id="new-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2 Hours"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Live">Live</SelectItem>
                    <SelectItem value="Pre-recorded">Pre-recorded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-link">Meeting / Video Link</Label>
              <Input
                id="new-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleAddSchedule} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
