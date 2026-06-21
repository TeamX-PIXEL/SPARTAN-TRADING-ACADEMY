"use client";

import * as React from "react";

import {
  CheckCircle2,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EllipsisVertical,
  Pencil,
  Users,
} from "lucide-react";

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
  formatDate,
  useAcademyStore,
  type Course,
} from "@/lib/academy-store";

import { CourseThumb } from "./course-thumb";
import { CourseFormDialog } from "./course-form-dialog";

interface Props {
  courses: Course[];
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Beginner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Intermediate: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Advanced: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export function CompletedCoursesTable({ courses }: Props) {
  const goEnrolledMembers = useAcademyStore((s) => s.goEnrolledMembers);
  const members = useAcademyStore((s) => s.members);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<Course | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const pageCount = Math.ceil(courses.length / pageSize);
  const pagedCourses = courses.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function memberCount(courseId: number) {
    return members.filter((m) => m.courseId === courseId).length;
  }

  function openEdit(course: Course) {
    setEditing(course);
    setEditOpen(true);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              <TableHead>Course Details</TableHead>
              <TableHead className="hidden lg:table-cell">Instructor</TableHead>
              <TableHead className="hidden md:table-cell">Difficulty</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead className="w-[100px] text-right">Action</TableHead>
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
                  <TableCell className="hidden text-sm lg:table-cell">{course.lecturer}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={`font-normal ${DIFFICULTY_STYLES[course.difficulty] ?? ""}`}>
                      {course.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      {formatDate(course.completed_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="tabular-nums">
                      {memberCount(course.id)}
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
                        <DropdownMenuItem onSelect={() => openEdit(course)}>
                          <Pencil className="mr-2 size-4" />
                          Edit Course
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  No completed courses yet.
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
