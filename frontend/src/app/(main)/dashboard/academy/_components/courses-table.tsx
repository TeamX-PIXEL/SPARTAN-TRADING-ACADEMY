"use client";

import * as React from "react";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDownWideNarrow, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

import { columns } from "./courses-columns";
import type { CourseRow } from "./courses-schema";

export function AcademyTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Server-side pagination state
  const [courses, setCourses] = React.useState<CourseRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  // Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [courseId, setCourseId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("0");
  const [thumbnailFile, setThumbnailFile] = React.useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Validation State
  const [idStatus, setIdStatus] = React.useState<"idle" | "checking" | "available" | "taken">("idle");

  const fetchCourses = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/admin/courses?skip=${pageIndex * pageSize}&limit=${pageSize}`,
      );
      if (res.status === 401) return;
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize]);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const pageCount = Math.ceil(total / pageSize);

  const table = useReactTable({
    data: courses,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    pageCount,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleSortChange = (value: string) => {
    if (value === "purchased") {
      // ✅ Updated to match the FastAPI JSON response
      setSorting([{ id: "purchased_count", desc: true }]);
    } else if (value === "price-desc") {
      setSorting([{ id: "price", desc: true }]);
    } else {
      setSorting([]);
    }
  };

  // Real-time ID Validation logic (Debounced)
  React.useEffect(() => {
    if (!courseId) {
      setIdStatus("idle");
      return;
    }

    setIdStatus("checking");

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/check-id/${courseId}`);
        if (res.ok) {
          const data = await res.json();
          setIdStatus(data.exists ? "taken" : "available");
        }
      } catch (error) {
        console.error("Error validating Course ID", error);
        setIdStatus("idle");
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [courseId]);

  async function handleAddCourse() {
    if (!title || !courseId) return alert("Course ID and Title are required.");
    setIsSubmitting(true);

    try {
      let thumbnailUrl = "default.jpg";

      if (thumbnailFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", thumbnailFile);
        const uploadRes = await fetchWithAuth(`${API_BASE_URL}/api/upload/thumbnail`, {
          method: "POST",
          body: formData,
        });
        setIsUploading(false);

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          alert(err.detail || "Failed to upload thumbnail");
          setIsSubmitting(false);
          return;
        }
        const uploadData = await uploadRes.json();
        thumbnailUrl = uploadData.url;
      }

      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          title: title,
          description: description,
          price: parseFloat(price),
          course_thumbnail: thumbnailUrl,
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setCourseId("");
        setTitle("");
        setDescription("");
        setPrice("0");
        setThumbnailFile(null);
        setThumbnailPreview(null);
        setIdStatus("idle");
        fetchCourses();
      } else {
        console.error("Failed to add course");
      }
    } catch (error) {
      console.error("Error creating course:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-0 gap-2">
        <div className="flex flex-col space-y-1.5 overflow-hidden">
          <CardTitle className="truncate">Upcoming Courses</CardTitle>
          <CardDescription className="truncate hidden sm:block">
            Manage your curriculum, pricing, and enrollments.
          </CardDescription>
        </div>


        <div className="flex items-center gap-2 shrink-0">
          <Select defaultValue="recent" onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px] sm:w-[180px] h-8">
              <div className="flex items-center gap-2 text-muted-foreground overflow-hidden">
                <ArrowDownWideNarrow className="size-4 shrink-0" />
                <span className="text-foreground truncate">
                  <SelectValue placeholder="Sort courses" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="purchased">Most Purchased</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>

          <Button size="icon" className="size-8 shrink-0" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" />
            <span className="sr-only">Add Course</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 text-muted-foreground text-sm">
            {total} row(s) total.
          </div>
          <div className="flex items-center justify-center gap-8">
            <div className="hidden items-center gap-2 lg:flex">
              <span className="font-medium text-sm">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPageIndex(0);
                }}
              >
                <SelectTrigger size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="font-medium text-sm whitespace-nowrap">
              Page {pageIndex + 1} of {pageCount}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                disabled={pageIndex >= pageCount - 1}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={pageIndex >= pageCount - 1}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
            <DialogDescription>Create a new course for the academy. You can add batches to it later.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-id">Custom Course ID</Label>
              <Input
                id="add-id"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value.toUpperCase().replace(/\s+/g, "-"))}
                placeholder="e.g. SOC-101"
              />
              {idStatus === "checking" && <p className="text-[10px] text-muted-foreground">Checking availability...</p>}
              {idStatus === "taken" && (
                <p className="text-[10px] text-destructive font-medium">
                  This Course ID is already taken. Please choose another.
                </p>
              )}
              {idStatus === "available" && (
                <p className="text-[10px] text-green-500 font-medium">Course ID is available!</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-title">Course Title</Label>
              <Input
                id="add-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Threat Hunting 101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-desc">Description</Label>
              <Textarea
                id="add-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-price">Price (INR)</Label>
                <Input id="add-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-thumb">Thumbnail</Label>
                <Input
                  id="add-thumb"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setThumbnailFile(file);
                      setThumbnailPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                {thumbnailPreview && (
                  <div className="relative mt-2">
                    <img src={thumbnailPreview} alt="Preview" className="w-full h-24 object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                      }}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleAddCourse}
              disabled={isSubmitting || idStatus === "taken" || idStatus === "checking" || !courseId || !title}
            >
              {isSubmitting ? "Creating..." : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
