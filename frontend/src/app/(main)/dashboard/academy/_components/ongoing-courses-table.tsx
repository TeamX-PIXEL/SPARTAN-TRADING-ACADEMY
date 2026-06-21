"use client";

import * as React from "react";

import {
  CalendarClock,
  CheckCircle2,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EllipsisVertical,
  GraduationCap,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  formatDateTime,
  useAcademyStore,
  type Course,
} from "@/lib/academy-store";

import { CourseThumb } from "./course-thumb";
import { CourseFormDialog } from "./course-form-dialog";

interface Props {
  courses: Course[];
}

export function OngoingCoursesTable({ courses }: Props) {
  const goLessonsManage = useAcademyStore((s) => s.goLessonsManage);
  const lessons = useAcademyStore((s) => s.lessons);
  const members = useAcademyStore((s) => s.members);
  const markCourseCompleted = useAcademyStore((s) => s.markCourseCompleted);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [confirmDoneOpen, setConfirmDoneOpen] = React.useState(false);
  const [confirmDoneCourse, setConfirmDoneCourse] = React.useState<Course | null>(null);
  const [editing, setEditing] = React.useState<Course | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const pageCount = Math.ceil(courses.length / pageSize);
  const pagedCourses = courses.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function lessonCount(courseId: number) {
    return lessons.filter((l) => l.courseId === courseId).length;
  }
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
              <TableHead>Course</TableHead>
              <TableHead className="hidden lg:table-cell">Instructor</TableHead>
              <TableHead className="hidden md:table-cell">Started</TableHead>
              <TableHead className="text-center">Lessons</TableHead>
              <TableHead className="text-center">Members</TableHead>
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
                      <Badge variant="outline" className="ml-1 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Live
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{course.lecturer}</TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{formatDateTime(course.scheduled_at)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="tabular-nums">
                      {lessonCount(course.id)}
                    </Badge>
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
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => openEdit(course)}>
                          <Pencil className="mr-2 size-4" />
                          Edit Course
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => goLessonsManage(course.id)}>
                          <GraduationCap className="mr-2 size-4" />
                          Manage Lessons
                          <CalendarClock className="ml-auto size-3.5 text-muted-foreground" />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-emerald-700 focus:text-emerald-700 dark:text-emerald-300"
                          onSelect={() => {
                            setConfirmDoneCourse(course);
                            setConfirmDoneOpen(true);
                          }}
                        >
                          <CheckCircle2 className="mr-2 size-4" />
                          Mark Course Done
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  No on-going courses. Upcoming courses start automatically at their scheduled date &amp; time.
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

      <AlertDialog open={confirmDoneOpen} onOpenChange={setConfirmDoneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Course as Done?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move <span className="font-medium text-foreground">{confirmDoneCourse?.title}</span> to the Completed tab. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (confirmDoneCourse) {
                  await markCourseCompleted(confirmDoneCourse.course_id);
                  toast.success(`${confirmDoneCourse.title} moved to the Completed tab.`);
                }
              }}
            >
              <CheckCircle2 className="mr-1.5 size-4" />
              Yes, Mark Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CourseFormDialog open={editOpen} onOpenChange={setEditOpen} course={editing} />
    </>
  );
}
