"use client";
"use no memo";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useSortable } from "@dnd-kit/sortable";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, GripVerticalIcon, Trash } from "lucide-react";

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
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

export type ChapterRow = {
  id: string; // Usually mapping to the real DB string/number
  dbId: number; // Store real db ID for API calls
  name: string; // Maps to title
  day: number; // Maps to days_after_start
  index: number;
};

export function DragHandle({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef } = useSortable({ id });

  return (
    <Button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 cursor-grab text-muted-foreground hover:bg-transparent active:cursor-grabbing"
      style={{ touchAction: "none" }}
    >
      <GripVerticalIcon className="size-4" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

const ActionCell = ({ row }: { row: { original: ChapterRow } }) => {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [title, setTitle] = React.useState(row.original.name);
  const [day, setDay] = React.useState(row.original.day.toString());

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/chapters/${row.original.dbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          days_after_start: parseInt(day),
        }),
      });

      if (res.ok) {
        setIsEditOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating chapter", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this chapter?")) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/chapters/${row.original.dbId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } catch (error) {
      console.error("Error deleting chapter", error);
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
            Edit Chapter
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
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>Update the chapter name and schedule offset.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Chapter Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Days After Start</Label>
              <Input type="number" value={day} onChange={(e) => setDay(e.target.value)} />
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

export const chapterColumns: ColumnDef<ChapterRow>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "index",
    header: "Chapter",
    cell: ({ row }) => <span className="font-medium text-muted-foreground">{row.index + 1}</span>,
  },
  {
    accessorKey: "name",
    header: "Chapter Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "day",
    header: "Day Offset",
    cell: ({ row }) => <span className="text-muted-foreground">Day {row.original.day}</span>,
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell row={row} />,
  },
];
