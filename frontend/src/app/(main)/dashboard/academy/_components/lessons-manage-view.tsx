"use client";

import * as React from "react";

import {
  ArrowLeft,
  CalendarClock,
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
  formatDateTime,
  useAcademyStore,
  type Course,
  type LessonType,
} from "@/lib/academy-store";
import { cn } from "@/lib/utils";

interface Props {
  course: Course | undefined;
}

const LESSON_TYPE_META: Record<
  string,
  { label: string; badge: string; icon: React.ReactNode; needsStart: boolean }
> = {
  youtube: {
    label: "YouTube Video",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    icon: <Video className="size-3" />,
    needsStart: false,
  },
  zoom: {
    label: "Live Zoom Stream",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: <Video className="size-3" />,
    needsStart: true,
  },
  meet: {
    label: "Google Meet Room",
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    icon: <Video className="size-3" />,
    needsStart: true,
  },
};

interface LessonForm {
  title: string;
  type: LessonType;
  link: string;
  startTime: string;
  duration: string;
}

export function LessonsManageView({ course }: Props) {
  const goAcademy = useAcademyStore((s) => s.goAcademy);
  const lessons = useAcademyStore((s) => s.lessons);
  const addLesson = useAcademyStore((s) => s.addLesson);
  const removeLesson = useAcademyStore((s) => s.removeLesson);
  const updateLesson = useAcademyStore((s) => s.updateLesson);
  const fetchLessons = useAcademyStore((s) => s.fetchLessons);

  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLesson, setEditLesson] = React.useState<any>(null);
  const [form, setForm] = React.useState<LessonForm>({
    title: "",
    type: "youtube",
    link: "",
    startTime: "",
    duration: "60 min",
  });
  const [saving, setSaving] = React.useState(false);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    if (course) {
      fetchLessons(course.course_id);
    }
  }, [course, fetchLessons]);

  const courseLessons = lessons.filter((l) => l.courseId === course?.id);

  const pageCount = Math.ceil(courseLessons.length / pageSize);
  const pagedLessons = courseLessons.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function set<K extends keyof LessonForm>(key: K, value: LessonForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const valid = form.title.trim() && form.link.trim() && (form.type === "youtube" || form.startTime);

  async function handleAdd() {
    if (!valid || !course) return;
    setSaving(true);
    const lesson = await addLesson(course.course_id, {
      title: form.title.trim(),
      type: form.type,
      link: form.link.trim(),
      startTime: form.type === "youtube" ? undefined : new Date(form.startTime).toISOString(),
      duration: form.duration.trim() || undefined,
    });
    setSaving(false);
    setAddOpen(false);
    setForm({ title: "", type: "youtube", link: "", startTime: "", duration: "60 min" });
    if (lesson) {
      toast.success(`${LESSON_TYPE_META[form.type]?.label} — ${form.title} is now live.`);
    } else {
      toast.error("Failed to create lesson.");
    }
  }

  async function handleRemove(lesson: any) {
    const ok = await removeLesson(lesson.id);
    if (ok) {
      toast.success(`Lesson "${lesson.title}" removed.`);
    } else {
      toast.error("Failed to delete lesson.");
    }
  }

  function handleOpenEdit(lesson: any) {
    setEditLesson(lesson);
    setForm({
      title: lesson.title,
      type: lesson.type as LessonType,
      link: lesson.link,
      startTime: lesson.startTime ? new Date(lesson.startTime).toISOString().slice(0, 16) : "",
      duration: lesson.duration || "60 min",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editLesson) return;
    setSaving(true);
    await updateLesson(editLesson.id, {
      title: form.title,
      type: form.type,
      link: form.link,
      startTime: form.type === "youtube" ? undefined : new Date(form.startTime).toISOString(),
      duration: form.duration || undefined,
    });
    setEditOpen(false);
    setSaving(false);
    toast.success(`Lesson "${form.title}" updated.`);
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
            Batch Lessons
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{course.title}</span>{" "}
            <span className="font-mono text-[11px]">({course.course_id})</span> — manage live sessions (YouTube / Zoom / Meet).
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
          <div className="flex flex-col space-y-1 overflow-hidden">
            <CardTitle className="truncate">Live Sessions</CardTitle>
            <CardDescription className="hidden truncate sm:block">
              Batch-level lessons: YouTube videos, Zoom streams, and Google Meet sessions.
            </CardDescription>
          </div>
          <Button onClick={() => {
            setForm({ title: "", type: "youtube", link: "", startTime: "", duration: "60 min" });
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
                    <TableHead className="hidden md:table-cell">Start Date &amp; Time</TableHead>
                    <TableHead className="hidden sm:table-cell">Duration</TableHead>
                    <TableHead className="hidden lg:table-cell">Added</TableHead>
                    <TableHead className="w-[120px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedLessons.length ? (
                    pagedLessons.map((lesson, idx) => {
                      const meta = LESSON_TYPE_META[lesson.type] ?? LESSON_TYPE_META["youtube"];
                      return (
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
                            <Badge variant="outline" className={cn("gap-1 font-normal", meta.badge)}>
                              {meta.icon}
                              {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {lesson.startTime ? (
                              <span className="flex items-center gap-1.5 text-sm">
                                <CalendarClock className="size-3.5 text-muted-foreground" />
                                {formatDateTime(lesson.startTime)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">On-demand</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-sm sm:table-cell">
                            {lesson.duration || "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm lg:table-cell">
                            {formatDate(lesson.addedAt)}
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
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                        No batch lessons yet. Click <span className="font-medium text-foreground">Add Lesson</span> to create a YouTube, Zoom, or Meet session.
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
                    <Label htmlFor="lesson-rows-per-page" className="font-medium text-sm">
                      Rows per page
                    </Label>
                    <Select
                      value={`${pageSize}`}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPageIndex(0);
                      }}
                    >
                      <SelectTrigger size="sm" className="w-20" id="lesson-rows-per-page">
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
              <Plus className="size-5" /> Add Lesson
            </DialogTitle>
            <DialogDescription>
              Schedule a live session for{" "}
              <span className="font-medium text-foreground">{course.title}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="l-title">Lesson Title</Label>
              <Input
                id="l-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Session 3 — Liquidity Sweeps"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Session Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v as LessonType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                    <SelectItem value="zoom">Live Zoom Stream</SelectItem>
                    <SelectItem value="meet">Google Meet Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-dur">Duration</Label>
                <Input
                  id="l-dur"
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 90 min"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="l-link">
                {form.type === "youtube" ? "YouTube URL" : form.type === "zoom" ? "Zoom Meeting URL" : "Google Meet URL"}
              </Label>
              <Input
                id="l-link"
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                placeholder={
                  form.type === "youtube"
                    ? "https://youtube.com/watch?v=..."
                    : form.type === "zoom"
                      ? "https://zoom.us/j/..."
                      : "https://meet.google.com/..."
                }
              />
            </div>

            {LESSON_TYPE_META[form.type]?.needsStart && (
              <div className="space-y-2">
                <Label htmlFor="l-start">Start Date &amp; Time</Label>
                <Input
                  id="l-start"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Members will see this as the meeting start time in the portal library.
                </p>
              </div>
            )}
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
              <Edit className="size-5" /> Edit Lesson
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
                <Label>Session Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v as LessonType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                    <SelectItem value="zoom">Live Zoom Stream</SelectItem>
                    <SelectItem value="meet">Google Meet Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="e.g. 90 min"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                {form.type === "youtube" ? "YouTube URL" : form.type === "zoom" ? "Zoom Meeting URL" : "Google Meet URL"}
              </Label>
              <Input
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
              />
            </div>

            {LESSON_TYPE_META[form.type]?.needsStart && (
              <div className="space-y-2">
                <Label>Start Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </div>
            )}
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
