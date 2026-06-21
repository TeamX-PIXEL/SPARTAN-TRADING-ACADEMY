"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit, EllipsisVertical, Trash, Users } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

import type { CourseRow } from "./courses-schema";

const ActionCell = ({ row }: { row: { original: CourseRow } }) => {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State - Now using the correct DB column names
  const [title, setTitle] = React.useState(row.original.title);
  const [description, setDescription] = React.useState(row.original.description || "");
  const [price, setPrice] = React.useState(row.original.price?.toString() || "0");

  // Always use the course_id string for API calls to FastAPI
  const primaryId = row.original.course_id ?? row.original.id;

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${primaryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Sending the correct keys back to FastAPI
        body: JSON.stringify({
          title: title,
          description: description,
          price: parseFloat(price),
        }),
      });

      if (res.ok) {
        setIsEditOpen(false);
        router.refresh();
      } else {
        console.error("Failed to update course");
      }
    } catch (error) {
      console.error("Error communicating with API", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${primaryId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting course", error);
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
            Edit Course
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            {/* Route based on the Course ID for the Batches page */}
            <Link href={`/dashboard/academy/${primaryId}/batches`}>
              <Users className="mr-2 size-4" />
              View Batches
            </Link>
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
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Update the details for this course. Click save when you are done.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-title-${primaryId}`}>Course Title</Label>
              <Input id={`edit-title-${primaryId}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-desc-${primaryId}`}>Description</Label>
              <Textarea
                id={`edit-desc-${primaryId}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-price-${primaryId}`}>Price (INR)</Label>
              <Input
                id={`edit-price-${primaryId}`}
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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

export const columns: ColumnDef<CourseRow>[] = [
  // Inside your export const columns: ColumnDef<CourseRow>[] array...

  {
    accessorKey: "course_id", // ✅ Changed from CourseUUID
    header: "ID",
    cell: ({ row }) => (
      <span
        className="font-mono text-muted-foreground truncate w-24 inline-block"
        title={row.original.course_id || String(row.original.id)}
      >
        {/* ✅ Show the custom course_id, or fallback to the integer DB id if missing */}
        {row.original.course_id || row.original.id}
      </span>
    ),
  },

  {
    accessorKey: "title", // Updated to match DB
    header: "Course Name",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    accessorKey: "description", // Updated to match DB
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate" title={row.original.description || ""}>
        {row.original.description || "No description"}
      </div>
    ),
  },
  {
    accessorKey: "price", // Matches DB perfectly
    header: "Price",
    cell: ({ row }) => {
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(row.original.price || 0);
      return <span className="tabular-nums">{formatted}</span>;
    },
  },
  // Find your purchased column in the columns array and update the accessorKey and cell:
  {
    accessorKey: "purchased_count", // ✅ Matches your DB exactly
    header: "Purchased",
    cell: ({ row }) => <Badge variant="secondary">{row.original.purchased_count}</Badge>, // ✅ Matches DB exactly
  },

  {
    id: "actions",
    cell: ({ row }) => <ActionCell row={row} />,
  },
];
