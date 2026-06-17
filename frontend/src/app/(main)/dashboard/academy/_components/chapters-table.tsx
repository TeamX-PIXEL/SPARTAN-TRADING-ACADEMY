"use client";
"use no memo";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flexRender, getCoreRowModel, type Row, useReactTable } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

import { type ChapterRow, chapterColumns } from "./chapters-columns";

export function DraggableChapterRow({ row }: { row: Row<ChapterRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id: row.original.id });
  return (
    <TableRow
      ref={setNodeRef}
      data-dragging={isDragging}
      className="relative z-0 bg-background data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  );
}

export function ChaptersTable({ initialData, courseId }: { initialData: ChapterRow[]; courseId: string }) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);

  // Sync state if initialData from server changes
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [day, setDay] = React.useState("0");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const table = useReactTable({
    data,
    columns: chapterColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // TODO: In the future, you can trigger a PUT request here to save the new index order to FastAPI!
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function handleAddChapter() {
    if (!title) return alert("Title is required");
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${courseId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          days_after_start: parseInt(day),
          chapter_index: 0, // Backend logic will auto-increment this
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setTitle("");
        setDay("0");
        router.refresh();
      }
    } catch (error) {
      console.error("Error creating chapter", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between pb-4">
        <div className="space-y-1">
          <h3 className="font-semibold leading-none tracking-tight">Course Chapters</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop to reorder chapters. Changes will apply to all future batches.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-3.5" />
          Add Chapter
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
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
              <SortableContext items={data.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                {table.getRowModel().rows.map((row) => (
                  <DraggableChapterRow key={row.id} row={row} />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </div>
      </DndContext>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Chapter</DialogTitle>
            <DialogDescription>Add a new module to the curriculum.</DialogDescription>
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
            <Button type="button" onClick={handleAddChapter} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Chapter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
