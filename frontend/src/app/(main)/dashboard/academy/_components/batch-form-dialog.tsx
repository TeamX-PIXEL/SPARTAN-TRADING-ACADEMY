"use client";

import * as React from "react";

import { ImagePlus, Loader2, X } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAcademyStore, type Course, type Difficulty } from "@/lib/academy-store";

interface BatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  selected_course_id: string;
  batch_id: string;
  course_id: string;
  title: string;
  description: string;
  longDescription: string;
  price: string;
  category: string;
  features: string[];
  duration_months: string;
  difficulty: Difficulty;
  image: string;
  discord_channel_id: string;
  discord_renewal_price: string;
  instructor: string;
  scheduled_at: string;
}

const EMPTY: FormState = {
  selected_course_id: "",
  batch_id: "",
  course_id: "",
  title: "",
  description: "",
  longDescription: "",
  price: "0",
  category: "",
  features: ["", "", "", ""],
  duration_months: "1",
  difficulty: "Beginner",
  image: "",
  discord_channel_id: "",
  discord_renewal_price: "",
  instructor: "",
  scheduled_at: "",
};

const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced", "Master"];

function isoToLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BatchFormDialog({ open, onOpenChange }: BatchFormDialogProps) {
  const courses = useAcademyStore((s) => s.courses);
  const addBatch = useAcademyStore((s) => s.addBatch);
  const updateCourse = useAcademyStore((s) => s.updateCourse);

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setImagePreview(null);
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleCourseSelect(courseId: string) {
    const course = courses.find((c) => c.course_id === courseId);
    if (!course) return;
    setForm((f) => ({
      ...f,
      selected_course_id: courseId,
      course_id: course.course_id,
      title: course.title,
      description: course.description,
      longDescription: course.longDescription,
      price: String(course.price),
      category: course.category,
      features: [
        course.features[0] ?? "",
        course.features[1] ?? "",
        course.features[2] ?? "",
        course.features[3] ?? "",
      ],
      duration_months: String(course.duration_months),
      difficulty: course.difficulty,
      image: course.image,
      discord_channel_id: course.discord_channel_id ?? "",
      discord_renewal_price: course.discord_renewal_price != null ? String(course.discord_renewal_price) : "",
      instructor: "",
      scheduled_at: "",
    }));
    setImagePreview(course.image || null);
  }

  function handleImageFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImagePreview(url);
      set("image", url);
    };
    reader.readAsDataURL(file);
  }

  const valid = form.selected_course_id && form.instructor.trim() && form.scheduled_at;

  async function handleSubmit() {
    if (!valid) return;
    setSaving(true);

    const selectedCourse = courses.find((c) => c.course_id === form.selected_course_id);
    if (!selectedCourse) { setSaving(false); return; }

    await updateCourse(selectedCourse.course_id, {
      title: form.title.trim(),
      description: form.description.trim(),
      longDescription: form.longDescription.trim() || "",
      price: parseFloat(form.price) || 0,
      image: form.image,
      category: form.category.trim() || "General",
      features: form.features.map((f) => f.trim()).filter(Boolean),
      duration_months: parseInt(form.duration_months, 10) || 1,
      difficulty: form.difficulty,
      discord_channel_id: form.discord_channel_id.trim() || undefined,
      discord_renewal_price: form.discord_renewal_price ? parseFloat(form.discord_renewal_price) || undefined : undefined,
    });

    await addBatch(selectedCourse.course_id, {
      course_id: selectedCourse.course_id,
      instructor: form.instructor.trim(),
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : "",
      discord_channel_id: form.discord_channel_id.trim() || undefined,
      discord_renewal_price: form.discord_renewal_price ? parseFloat(form.discord_renewal_price) || undefined : undefined,
      ...(form.batch_id.trim() ? { batch_id: form.batch_id.trim() } : {}),
    });

    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register New Batch</DialogTitle>
          <DialogDescription>
            Select an existing course to prefill details, then configure instructor and schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="space-y-2">
            <Label>Select Course</Label>
            <Select value={form.selected_course_id} onValueChange={handleCourseSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.course_id} value={c.course_id}>
                    {c.title} ({c.course_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Selecting a course prefills all product details below. Changes to product fields will update the course table.
            </p>
          </div>

          {form.selected_course_id && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bf-course-id">Course ID</Label>
                  <Input id="bf-course-id" value={form.course_id} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bf-category">Category</Label>
                  <Input
                    id="bf-category"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bf-title">Course Title</Label>
                <Input
                  id="bf-title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bf-desc">Short Description</Label>
                <Textarea
                  id="bf-desc"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bf-long">Full Description</Label>
                <Textarea
                  id="bf-long"
                  value={form.longDescription}
                  onChange={(e) => set("longDescription", e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bf-price">Price (INR)</Label>
                  <Input
                    id="bf-price"
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bf-duration">Duration (Months)</Label>
                  <Input
                    id="bf-duration"
                    type="number"
                    min={1}
                    value={form.duration_months}
                    onChange={(e) => set("duration_months", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bf-discord-id">Discord Channel / Group ID</Label>
                  <Input
                    id="bf-discord-id"
                    value={form.discord_channel_id}
                    onChange={(e) => set("discord_channel_id", e.target.value)}
                    placeholder="e.g. 1234567890123456789"
                  />
                  <p className="text-[11px] text-muted-foreground">Prefilled from course. Edits save to this batch only.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bf-discord-renewal">Discord Renewal Price (INR)</Label>
                  <Input
                    id="bf-discord-renewal"
                    type="number"
                    min={0}
                    value={form.discord_renewal_price}
                    onChange={(e) => set("discord_renewal_price", e.target.value)}
                    placeholder="e.g. 4092"
                  />
                  <p className="text-[11px] text-muted-foreground">Prefilled from course. Edits save to this batch only.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                  <SelectTrigger id="bf-difficulty" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Inclusions &amp; Features</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {form.features.map((feat, i) => (
                    <Input
                      key={i}
                      value={feat}
                      onChange={(e) => {
                        const next = [...form.features];
                        next[i] = e.target.value;
                        set("features", next);
                      }}
                      placeholder={[
                        "e.g. 12 Live Sessions",
                        "e.g. Recorded Replays",
                        "e.g. Private Discord Access",
                        "e.g. 1 Year Free Discord Support",
                      ][i]}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Showcase Image</Label>
                <div className="flex items-start gap-4">
                  <label
                    htmlFor="bf-image"
                    className="flex h-28 w-44 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Showcase preview" className="h-full w-full rounded-md object-cover" />
                    ) : (
                      <>
                        <ImagePlus className="size-5" />
                        <span className="text-[11px]">Click to upload</span>
                      </>
                    )}
                  </label>
                  <input
                    id="bf-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-[11px] text-muted-foreground">
                      Used as the card thumbnail. Leave empty to use the course image.
                    </p>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImagePreview(null);
                          set("image", "");
                        }}
                      >
                        <X className="mr-1.5 size-3.5" /> Remove image
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-xs font-medium text-primary">Batch Details</p>
                <p className="text-[11px] text-muted-foreground">These fields are specific to this batch only.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bf-batch-id">Batch ID <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="bf-batch-id"
                  value={form.batch_id}
                  onChange={(e) => set("batch_id", e.target.value.toUpperCase().replace(/\s+/g, "-"))}
                  placeholder={`Auto: ${form.course_id}-B1`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave empty for auto-generation ({form.course_id}-B1, B2, ...). Custom IDs must be unique.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bf-lecturer">Lecturer / Lead</Label>
                  <Input
                    id="bf-lecturer"
                    value={form.instructor}
                    onChange={(e) => set("instructor", e.target.value)}
                    placeholder="e.g. Arjun Mehta"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bf-start">Start Date &amp; Time</Label>
                  <Input
                    id="bf-start"
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => set("scheduled_at", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {saving ? "Saving..." : "Create Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
