"use client";

import * as React from "react";

import {
  ArrowLeft,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Edit,
  EllipsisVertical,
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Props {
  course: Course | undefined;
}

interface CourseLessonForm {
  title: string;
  link: string;
  duration: string;
}

export function CourseLessonsView({ course }: Props) {
  const goAcademy = useAcademyStore((s) => s.goAcademy);
  const courseLessons = useAcademyStore((s) => s.courseLessons);
  const fetchCourseLessons = useAcademyStore((s) => s.fetchCourseLessons);
  const addCourseLesson = useAcademyStore((s) => s.addCourseLesson);
  const updateCourseLesson = useAcademyStore((s) => s.updateCourseLesson);
  const removeCourseLesson = useAcademyStore((s) => s.removeCourseLesson);

  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLesson, setEditLesson] = React.useState<(typeof courseLessons)[0] | null>(null);
  const [form, setForm] = React.useState<CourseLessonForm>({
    title: "",
    link: "",
    duration: "",
  });
  const [saving, setSaving] = React.useState(false);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    if (course) {
      fetchCourseLessons(course.course_id);
    }
  }, [course, fetchCourseLessons]);

  const pageCount = Math.ceil(courseLessons.length / pageSize);
  const pagedLessons = courseLessons.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function set<K extends keyof CourseLessonForm>(key: K, value: CourseLessonForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const valid = form.title.trim() && form.link.trim();

  async function handleAdd() {
    if (!valid || !course) return;
    setSaving(true);
    const lesson = await addCourseLesson(course.course_id, {
      title: form.title.trim(),
      link: form.link.trim(),
      duration: form.duration.trim() || undefined,
    });
    setSaving(false);
    setAddOpen(false);
    setForm({ title: "", link: "", duration: "" });
    if (lesson) {
      toast.success(`Course lesson "${lesson.title}" added.`);
    } else {
      toast.error("Failed to add lesson.");
    }
  }

  async function handleRemove(lesson: (typeof courseLessons)[0]) {
    const ok = await removeCourseLesson(lesson.id);
    if (ok) {
      toast.success(`Course lesson "${lesson.title}" removed.`);
    } else {
      toast.error("Failed to delete lesson.");
    }
  }

  function handleOpenEdit(lesson: (typeof courseLessons)[0]) {
    setEditLesson(lesson);
    setForm({
      title: lesson.title,
      link: lesson.link || "",
      duration: lesson.duration || "",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editLesson) return;
    setSaving(true);
    await updateCourseLesson(editLesson.id, {
      title: form.title.trim(),
      link: form.link.trim() || undefined,
      duration: form.duration.trim() || undefined,
    });
    setEditOpen(false);
    setSaving(false);
    toast.success(`Course lesson "${form.title}" updated.`);
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">Course not found.</p>
        <Button variant="outline" onClick={goAcademy}>
          <ArrowLeft className="mr-2 size-4" /> Back to Academy
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground" onClick={goAcademy}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Academy
        </Button>
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <GraduationCap className="size-6 text-primary" />
            Course Lessons
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{course.title}</span>{" "}
            <span className="font-mono text-[11px]">({course.course_id})</span> — pre-launch YouTube videos shown to clients before batch starts.
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
          <div className="flex flex-col space-y-1 overflow-hidden">
            <CardTitle className="truncate">Pre-launch Videos</CardTitle>
            <CardDescription className="hidden truncate sm:block">
              YouTube lessons stored in <span className="font-mono">course_lessons</span> table. Shown to clients before the batch scheduled time.
            </CardDescription>
          </div>
          <Button onClick={() => {
            setForm({ title: "", link: "", duration: "" });
            setAddOpen(true);
          }} className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            Add Lesson
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead>Lesson</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Duration</TableHead>
                    <TableHead className="hidden lg:table-cell">Added</TableHead>
                    <TableHead className="w-[120px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLessons.length ? (
                    pagedLessons.map((lesson, idx) => (
                      <TableRow key={lesson.id}>
                        <TableCell className="text-center font-mono text-sm text-muted-foreground">
                          {pageIndex * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="max-w-[260px] truncate font-mono text-[11px] text-muted-foreground">
                            {lesson.link}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 font-normal border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            <Video className="size-3" />
                            YouTube Video
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">
                          {lesson.duration || "—"}
                        </TableCell>
                        <TableCell className="hidden text-sm lg:table-cell">
                          {formatDate(lesson.added_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                                <EllipsisVertical className="size-4" />
                                <span className="sr-only">Open actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onSelect={() => handleOpenEdit(lesson)}>
                                <Edit className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={lesson.link} target="_blank" rel="noopener noreferrer">
                                  <Video className="mr-2 size-4" />
                                  Open
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => handleRemove(lesson)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                        No course lessons yet. Click <span className="font-medium text-foreground">Add Lesson</span> to add pre-launch YouTube videos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {courseLessons.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 text-muted-foreground text-sm">
                  {courseLessons.length} lesson(s) total.
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div className="hidden items-center gap-2 lg:flex">
                    <Label htmlFor="cl-rows-per-page" className="font-medium text-sm">
                      Rows per page
                    </Label>
                    <Select
                      value={`${pageSize}`}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPageIndex(0);
                      }}
                    >
                      <SelectTrigger size="sm" className="w-20" id="cl-rows-per-page">
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
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>
                      <ChevronsLeftIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0}>
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1}>
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1}>
                      <ChevronsRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Add Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" /> Add Course Lesson
            </DialogTitle>
            <DialogDescription>
              Add a pre-launch YouTube video for{" "}
              <span className="font-medium text-foreground">{course.title}</span>. These videos are shown to clients before the batch starts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cl-title">Lesson Title</Label>
              <Input
                id="cl-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Introduction to the Course"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cl-link">YouTube URL</Label>
                <Input
                  id="cl-link"
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-dur">Duration</Label>
                <Input
                  id="cl-dur"
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 45 min"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!valid || saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-5" /> Edit Course Lesson
            </DialogTitle>
            <DialogDescription>
              Update lesson details for <span className="font-medium text-foreground">{editLesson?.title}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 45 min"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
