"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheckIcon, Clock, Edit, EllipsisVertical, ExternalLink, PlayCircle, Trash, Video } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

export type ScheduleRow = {
  id: string;
  moduleIndex: number;
  moduleName: string;
  scheduledAt: string;
  rawScheduledAt?: string;
  duration: string;
  type: "Live" | "Pre-recorded";
  status: "Scheduled" | "Completed" | "Ongoing";
  link: string;
};

const MOCK_CHAPTERS = ["Introduction and Setup", "Core Concepts", "Advanced Techniques", "Final Assessment Project"];

const ActionCell = ({ row }: { row: { original: ScheduleRow } }) => {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [chapterMode, setChapterMode] = React.useState<string>(row.original.moduleName);
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [duration, setDuration] = React.useState(row.original.duration);
  const [link, setLink] = React.useState(row.original.link !== "#" ? row.original.link : "");

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/schedules/${row.original.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: scheduledAt ? scheduledAt + ":00" : null,
          estimated_duration: duration,
          join_link: link,
        }),
      });

      if (res.ok) {
        setIsEditOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating schedule", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/schedules/${row.original.id}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } catch (error) {
      console.error("Error deleting schedule", error);
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
            Edit Schedule
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem className="text-destructive" onSelect={handleDelete}>
            <Trash className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Update the module, timing, and meeting link.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Module / Chapter</Label>
              <Select
                defaultValue={MOCK_CHAPTERS.includes(row.original.moduleName) ? row.original.moduleName : "custom"}
                onValueChange={setChapterMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_CHAPTERS.map((chap) => (
                    <SelectItem key={chap} value={chap}>
                      {chap}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="font-medium text-blue-500">
                    + Add Custom Chapter...
                  </SelectItem>
                </SelectContent>
              </Select>
              {chapterMode === "custom" && <Input placeholder="Enter custom chapter name" className="mt-2" autoFocus />}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`datetime-${row.original.id}`}>Date & Time</Label>
              <Input
                id={`datetime-${row.original.id}`}
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Current: {row.original.scheduledAt}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`duration-${row.original.id}`}>Duration</Label>
              <Input
                id={`duration-${row.original.id}`}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`link-${row.original.id}`}>Meeting / Video Link</Label>
              <Input
                id={`link-${row.original.id}`}
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const scheduleColumns: ColumnDef<ScheduleRow>[] = [
  {
    accessorKey: "moduleIndex",
    header: () => <div className="text-center">Module</div>,
    cell: ({ row }) => <div className="text-center font-medium text-muted-foreground">{row.original.moduleIndex}</div>,
  },
  {
    accessorKey: "moduleName",
    header: "Module Name",
    cell: ({ row }) => <span className="font-medium">{row.original.moduleName}</span>,
  },
  {
    accessorKey: "scheduledAt",
    header: "Scheduled At",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.scheduledAt}</span>,
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.duration}</span>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge variant={type === "Live" ? "default" : "secondary"} className="gap-1.5 px-1.5 py-0.5">
          {type === "Live" ? <Video className="size-3.5" /> : <PlayCircle className="size-3.5" />}
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className="gap-1.5 px-1.5 py-0.5 text-muted-foreground">
          {status === "Completed" && (
            <CircleCheckIcon className="size-3.5 fill-green-500 stroke-primary-foreground dark:fill-green-600" />
          )}
          {status === "Scheduled" && <Clock className="size-3.5" />}
          {status === "Ongoing" && <Video className="size-3.5 text-green-500 dark:text-green-400" />}
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "link",
    header: "Link",
    cell: ({ row }) => (
      <Button variant="link" className="h-8 px-0 text-blue-500" asChild>
        <a href={row.original.link !== "#" ? row.original.link : ""} target="_blank" rel="noopener noreferrer">
          View Link <ExternalLink className="ml-1 size-3" />
        </a>
      </Button>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ActionCell row={row} />
      </div>
    ),
  },
];
