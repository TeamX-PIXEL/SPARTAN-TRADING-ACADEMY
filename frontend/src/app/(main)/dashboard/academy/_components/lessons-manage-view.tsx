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
  MessageSquare,
  Plus,
  Trash2,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDate,
  formatDateTime,
  useAcademyStore,
  type Course,
  type LessonType,
  type Member,
} from "@/lib/academy-store";
import { cn } from "@/lib/utils";

interface Props {
  course: Course | undefined;
}

const LESSON_TYPE_META: Record<
  LessonType,
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
  const goEnrolledMembers = useAcademyStore((s) => s.goEnrolledMembers);
  const lessons = useAcademyStore((s) => s.lessons);
  const members = useAcademyStore((s) => s.members);
  const addLesson = useAcademyStore((s) => s.addLesson);
  const removeLesson = useAcademyStore((s) => s.removeLesson);

  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLesson, setEditLesson] = React.useState<{ id: number; title: string; type: LessonType; link: string; startTime: string; duration: string } | null>(null);
  const [discordEditOpen, setDiscordEditOpen] = React.useState(false);
  const [discordEditMember, setDiscordEditMember] = React.useState<Member | null>(null);
  const [discordExpiry, setDiscordExpiry] = React.useState("");
  const [form, setForm] = React.useState<LessonForm>({
    title: "",
    type: "youtube",
    link: "",
    startTime: "",
    duration: "60 min",
  });
  const [saving, setSaving] = React.useState(false);

  const [lessonPageIndex, setLessonPageIndex] = React.useState(0);
  const [lessonPageSize, setLessonPageSize] = React.useState(10);
  const [memberPageIndex, setMemberPageIndex] = React.useState(0);
  const [memberPageSize, setMemberPageSize] = React.useState(10);

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

  const courseLessons = lessons.filter((l) => l.courseId === course.id);
  const courseMembers = members.filter((m) => m.courseId === course.id);

  const lessonPageCount = Math.ceil(courseLessons.length / lessonPageSize);
  const pagedLessons = courseLessons.slice(lessonPageIndex * lessonPageSize, (lessonPageIndex + 1) * lessonPageSize);

  const memberPageCount = Math.ceil(courseMembers.length / memberPageSize);
  const pagedMembers = courseMembers.slice(memberPageIndex * memberPageSize, (memberPageIndex + 1) * memberPageSize);

  React.useEffect(() => {
    if (lessonPageIndex >= lessonPageCount && lessonPageCount > 0) {
      setLessonPageIndex(lessonPageCount - 1);
    }
  }, [lessonPageIndex, lessonPageCount]);

  React.useEffect(() => {
    if (memberPageIndex >= memberPageCount && memberPageCount > 0) {
      setMemberPageIndex(memberPageCount - 1);
    }
  }, [memberPageIndex, memberPageCount]);

  function set<K extends keyof LessonForm>(key: K, value: LessonForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const valid = form.title.trim() && form.link.trim() && (form.type === "youtube" || form.startTime);

  async function handleAdd() {
    if (!valid) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 350));
    addLesson({
      courseId: course!.id,
      title: form.title.trim(),
      type: form.type,
      link: form.link.trim(),
      startTime: form.type === "youtube" ? undefined : new Date(form.startTime).toISOString(),
      duration: form.duration.trim() || undefined,
    });
    setSaving(false);
    setAddOpen(false);
    setForm({ title: "", type: "youtube", link: "", startTime: "", duration: "60 min" });
    toast.success(`${LESSON_TYPE_META[form.type].label} — ${form.title} is now live for members.`);
  }

  function handleRemove(id: number, title: string) {
    removeLesson(id);
    toast.success(`Lesson removed — ${title}`);
  }

  function handleOpenEdit(lesson: { id: number; title: string; type: LessonType; link: string; startTime?: string; duration?: string }) {
    setEditLesson({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      link: lesson.link,
      startTime: lesson.startTime ? new Date(lesson.startTime).toISOString().slice(0, 16) : "",
      duration: lesson.duration || "",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editLesson) return;
    useAcademyStore.setState((s) => ({
      lessons: s.lessons.map((l) =>
        l.id === editLesson.id
          ? {
              ...l,
              title: editLesson.title,
              type: editLesson.type,
              link: editLesson.link,
              startTime: editLesson.type === "youtube" ? undefined : new Date(editLesson.startTime).toISOString(),
              duration: editLesson.duration || undefined,
            }
          : l,
      ),
    }));
    setEditOpen(false);
    toast.success(`Lesson "${editLesson.title}" updated.`);
  }

  function handleOpenDiscordEdit(member: Member) {
    setDiscordEditMember(member);
    setDiscordExpiry(member.discordExpiry || "");
    setDiscordEditOpen(true);
  }

  async function handleSaveDiscordEdit() {
    if (!discordEditMember) return;
    useAcademyStore.setState((s) => ({
      members: s.members.map((m) =>
        m.id === discordEditMember.id
          ? { ...m, discordExpiry: discordExpiry || undefined }
          : m,
      ),
    }));
    setDiscordEditOpen(false);
    toast.success(`Discord expiry updated for ${discordEditMember.name}.`);
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
            Lessons Management
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{course.title}</span>{" "}
            <span className="font-mono text-[11px]">({course.course_id})</span> — launch YouTube videos and
            live Google Meet / Zoom sessions, then manage enrolled members.
          </p>
        </div>
      </div>

      <Tabs defaultValue="lessons" className="w-full">
        <TabsList>
          <TabsTrigger value="lessons" className="gap-1.5">
            <Video className="size-3.5" />
            Lesson Manage
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {courseLessons.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="size-3.5" />
            Members Manage
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
              {courseMembers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="mt-4">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
              <div className="flex flex-col space-y-1 overflow-hidden">
                <CardTitle className="truncate">Published Lessons</CardTitle>
                <CardDescription className="hidden truncate sm:block">
                  Launch YouTube videos, Zoom webinars or Google Meet sessions with a start date &amp; time.
                </CardDescription>
              </div>
              <Button onClick={() => setAddOpen(true)} className="shrink-0 gap-1.5">
                <Plus className="size-4" />
                Launch Lesson
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
                        <TableHead className="hidden lg:table-cell">Published</TableHead>
                        <TableHead className="w-[120px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedLessons.length ? (
                        pagedLessons.map((lesson, idx) => {
                          const meta = LESSON_TYPE_META[lesson.type];
                          return (
                            <TableRow key={lesson.id}>
                              <TableCell className="text-center font-mono text-sm text-muted-foreground">
                                {lessonPageIndex * lessonPageSize + idx + 1}
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
                                      onSelect={() => handleRemove(lesson.id, lesson.title)}
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
                            No lessons published yet. Click <span className="font-medium text-foreground">Launch Lesson</span> to start.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 text-muted-foreground text-sm">
                    {courseLessons.length} row(s) total.
                  </div>
                  <div className="flex items-center justify-center gap-8">
                    <div className="hidden items-center gap-2 lg:flex">
                      <Label htmlFor="lesson-rows-per-page" className="font-medium text-sm">
                        Rows per page
                      </Label>
                      <Select
                        value={`${lessonPageSize}`}
                        onValueChange={(value) => {
                          setLessonPageSize(Number(value));
                          setLessonPageIndex(0);
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
                      Page {lessonPageIndex + 1} of {lessonPageCount || 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => setLessonPageIndex(0)}
                        disabled={lessonPageIndex === 0}
                      >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setLessonPageIndex((p) => Math.max(0, p - 1))}
                        disabled={lessonPageIndex === 0}
                      >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setLessonPageIndex((p) => Math.min(lessonPageCount - 1, p + 1))}
                        disabled={lessonPageIndex >= lessonPageCount - 1}
                      >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 lg:flex"
                        onClick={() => setLessonPageIndex(lessonPageCount - 1)}
                        disabled={lessonPageIndex >= lessonPageCount - 1}
                      >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card className="w-full">
            <CardHeader className="pb-0">
              <CardTitle>Enrolled Members</CardTitle>
              <CardDescription>
                Manage client access and contact details for this course.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[60px] text-center">#</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden lg:table-cell">Discord</TableHead>
                        <TableHead className="hidden md:table-cell">Discord Expiry</TableHead>
                        <TableHead className="text-center">Access</TableHead>
                        <TableHead className="hidden md:table-cell">Joined</TableHead>
                        <TableHead className="w-[64px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedMembers.length ? (
                        pagedMembers.map((m, idx) => (
                          <TableRow key={m.id}>
                            <TableCell className="text-center font-mono text-sm text-muted-foreground">
                              {memberPageIndex * memberPageSize + idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                  {(m.firstname || m.name).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{m.name}</p>
                                  <p className="text-[11px] text-muted-foreground">@{m.username || m.tvid}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="flex items-center gap-1.5 text-sm">
                                <MessageSquare className="size-3.5 text-muted-foreground" />
                                {m.email}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {m.discordid ? (
                                <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/10 font-normal text-violet-700 dark:text-violet-300">
                                  <MessageSquare className="size-3" />
                                  {m.discordid}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Not bound</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden text-sm md:table-cell">
                              <span className="flex items-center gap-1.5">
                                <CalendarClock className="size-3.5 text-muted-foreground" />
                                {m.discordExpiry || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-normal",
                                  m.accessType === "free"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                )}
                              >
                                {m.accessType === "free" ? "Free" : "Paid"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden text-sm md:table-cell">{formatDate(m.joinedAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenDiscordEdit(m)}
                              >
                                <Edit className="size-4" />
                                <span className="sr-only">Edit Discord</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                            No enrolled members yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 text-muted-foreground text-sm">
                    {courseMembers.length} row(s) total.
                  </div>
                  <div className="flex items-center justify-center gap-8">
                    <div className="hidden items-center gap-2 lg:flex">
                      <Label htmlFor="member-rows-per-page" className="font-medium text-sm">
                        Rows per page
                      </Label>
                      <Select
                        value={`${memberPageSize}`}
                        onValueChange={(value) => {
                          setMemberPageSize(Number(value));
                          setMemberPageIndex(0);
                        }}
                      >
                        <SelectTrigger size="sm" className="w-20" id="member-rows-per-page">
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
                      Page {memberPageIndex + 1} of {memberPageCount || 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => setMemberPageIndex(0)}
                        disabled={memberPageIndex === 0}
                      >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setMemberPageIndex((p) => Math.max(0, p - 1))}
                        disabled={memberPageIndex === 0}
                      >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setMemberPageIndex((p) => Math.min(memberPageCount - 1, p + 1))}
                        disabled={memberPageIndex >= memberPageCount - 1}
                      >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 lg:flex"
                        onClick={() => setMemberPageIndex(memberPageCount - 1)}
                        disabled={memberPageIndex >= memberPageCount - 1}
                      >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5" /> Launch a Lesson
            </DialogTitle>
            <DialogDescription>
              Publish a YouTube video or schedule a live Google Meet / Zoom session for{" "}
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

            {LESSON_TYPE_META[form.type].needsStart && (
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
              {saving ? "Launching..." : "Launch Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-5" /> Edit Lesson
            </DialogTitle>
            <DialogDescription>
              Update the lesson details for <span className="font-medium text-foreground">{editLesson?.title}</span>.
            </DialogDescription>
          </DialogHeader>

          {editLesson && (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Lesson Title</Label>
                <Input
                  value={editLesson.title}
                  onChange={(e) => setEditLesson((l) => l ? { ...l, title: e.target.value } : l)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Type</Label>
                  <Select value={editLesson.type} onValueChange={(v) => setEditLesson((l) => l ? { ...l, type: v as LessonType } : l)}>
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
                    value={editLesson.duration}
                    onChange={(e) => setEditLesson((l) => l ? { ...l, duration: e.target.value } : l)}
                    placeholder="e.g. 90 min"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {editLesson.type === "youtube" ? "YouTube URL" : editLesson.type === "zoom" ? "Zoom Meeting URL" : "Google Meet URL"}
                </Label>
                <Input
                  value={editLesson.link}
                  onChange={(e) => setEditLesson((l) => l ? { ...l, link: e.target.value } : l)}
                />
              </div>

              {LESSON_TYPE_META[editLesson.type].needsStart && (
                <div className="space-y-2">
                  <Label>Start Date &amp; Time</Label>
                  <Input
                    type="datetime-local"
                    value={editLesson.startTime}
                    onChange={(e) => setEditLesson((l) => l ? { ...l, startTime: e.target.value } : l)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discordEditOpen} onOpenChange={setDiscordEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" /> Edit Discord Expiry
            </DialogTitle>
            <DialogDescription>
              Set the Discord access expiry for <span className="font-medium text-foreground">{discordEditMember?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="space-y-2">
              <Label>Discord Expiry Date</Label>
              <Input
                type="date"
                value={discordExpiry}
                onChange={(e) => setDiscordExpiry(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Current: {discordEditMember?.discordExpiry || "No expiry set"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscordEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDiscordEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
