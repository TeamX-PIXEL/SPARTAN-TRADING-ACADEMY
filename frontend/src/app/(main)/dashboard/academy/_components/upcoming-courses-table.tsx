"use client";

import * as React from "react";

import {
  AlertCircle,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EllipsisVertical,
  Lock,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatCurrency,
  formatDateTime,
  useAcademyStore,
  type Course,
} from "@/lib/academy-store";
import { cn } from "@/lib/utils";

import { CourseFormDialog } from "./course-form-dialog";
import { CourseThumb } from "./course-thumb";

interface Props {
  courses: Course[];
}

export function UpcomingCoursesTable({ courses }: Props) {
  const removeCourse = useAcademyStore((s) => s.removeCourse);
  const goEnrolledMembers = useAcademyStore((s) => s.goEnrolledMembers);

  const [editing, setEditing] = React.useState<Course | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const pageCount = Math.ceil(courses.length / pageSize);
  const pagedCourses = courses.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function openEdit(course: Course) {
    setEditing(course);
    setEditOpen(true);
  }

  async function handleRemove(course: Course) {
    if (course.purchased_count > 0) {
      toast.error(`Cannot remove course — ${course.title} has ${course.purchased_count} enrolled member(s). Remove members first.`);
      return;
    }
    const ok = await removeCourse(course.course_id);
    if (ok) {
      toast.success(`Course removed — ${course.course_id} — ${course.title} was deleted.`);
    } else {
      toast.error("Failed to delete course.");
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Instructor</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-center">Enrolled</TableHead>
              <TableHead className="w-[64px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedCourses.length ? (
              pagedCourses.map((course, idx) => (
                <TableRow key={course.id}>
                  <TableCell className="text-center font-mono text-sm text-muted-foreground">
                    {pageIndex * pageSize + idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-md border">
                        <CourseThumb title={course.title} image={course.image} category={course.category} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{course.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{course.course_id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="font-normal">
                      {course.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{course.lecturer}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(course.price)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{formatDateTime(course.scheduled_at)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {course.duration_months} {course.duration_months > 1 ? "Months" : "Month"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={course.purchased_count > 0 ? "default" : "secondary"} className="tabular-nums">
                      {course.purchased_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                          <EllipsisVertical className="size-4" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => openEdit(course)}>
                          <Pencil className="mr-2 size-4" />
                          Edit Course
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => goEnrolledMembers(course.id)}>
                          <Users className="mr-2 size-4" />
                          Enrolled Members
                          {course.purchased_count > 0 && (
                            <Badge variant="secondary" className="ml-auto tabular-nums">
                              {course.purchased_count}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {course.purchased_count === 0 ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => handleRemove(course)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Remove
                          </DropdownMenuItem>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="flex w-full cursor-not-allowed items-center px-2 py-1.5 text-sm text-muted-foreground opacity-60"
                                  role="menuitem"
                                  aria-disabled
                                >
                                  <Lock className="mr-2 size-4" />
                                  Remove
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="flex items-center gap-1.5 text-xs">
                                  <AlertCircle className="size-3" />
                                  Locked — {course.purchased_count} member(s) enrolled
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className={cn("h-28 text-center text-muted-foreground")}>
                  No upcoming courses yet. Click <span className="font-medium text-foreground">New Course</span> to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
        <div className="flex-1 text-muted-foreground text-sm">
          {courses.length} row(s) total.
        </div>
        <div className="flex items-center justify-center gap-8">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="font-medium text-sm">
              Rows per page
            </Label>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((s) => (
                    <SelectItem key={s} value={`${s}`}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="font-medium text-sm whitespace-nowrap">
            Page {pageIndex + 1} of {pageCount || 1}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              disabled={pageIndex >= pageCount - 1}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              onClick={() => setPageIndex(pageCount - 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CourseFormDialog open={editOpen} onOpenChange={setEditOpen} course={editing} />
    </>
  );
}
