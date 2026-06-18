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

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
}

interface FormState {
  course_id: string;
  title: string;
  description: string;
  longDescription: string;
  price: string;
  category: string;
  features: string[];
  duration_months: string;
  lecturer: string;
  difficulty: Difficulty;
  scheduled_at: string;
  image: string;
}

const EMPTY: FormState = {
  course_id: "",
  title: "",
  description: "",
  longDescription: "",
  price: "0",
  category: "",
  features: ["", "", "", ""],
  duration_months: "1",
  lecturer: "",
  difficulty: "Beginner",
  scheduled_at: "",
  image: "",
};

function isoToLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced", "Master"];

export function CourseFormDialog({ open, onOpenChange, course }: CourseFormDialogProps) {
  const addCourse = useAcademyStore((s) => s.addCourse);
  const updateCourse = useAcademyStore((s) => s.updateCourse);

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [idTaken, setIdTaken] = React.useState(false);

  const isEdit = Boolean(course);

  React.useEffect(() => {
    if (!open) return;
    if (course) {
      setForm({
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
        lecturer: course.lecturer,
        difficulty: course.difficulty,
        scheduled_at: isoToLocalInput(course.scheduled_at),
        image: course.image,
      });
      setImagePreview(course.image || null);
      setIdTaken(false);
    } else {
      setForm(EMPTY);
      setImagePreview(null);
      setIdTaken(false);
    }
  }, [open, course]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const courses = useAcademyStore((s) => s.courses);
  React.useEffect(() => {
    if (!form.course_id) {
      setIdTaken(false);
      return;
    }
    const clash = courses.some(
      (c) => c.course_id.toLowerCase() === form.course_id.toLowerCase() && c.id !== course?.id,
    );
    setIdTaken(clash);
  }, [form.course_id, courses, course?.id]);

  const valid =
    form.course_id.trim() &&
    form.title.trim() &&
    form.price.trim() &&
    form.scheduled_at &&
    !idTaken;

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

  async function handleSubmit() {
    if (!valid) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 350));

    const payload = {
      course_id: form.course_id.trim().toUpperCase().replace(/\s+/g, "-"),
      title: form.title.trim(),
      description: form.description.trim(),
      longDescription: form.longDescription.trim(),
      price: parseFloat(form.price) || 0,
      image: form.image,
      category: form.category.trim() || "General",
      features: form.features.map((f) => f.trim()).filter(Boolean),
      duration_months: parseInt(form.duration_months, 10) || 1,
      lecturer: form.lecturer.trim() || "TBA",
      difficulty: form.difficulty,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    };

    if (isEdit && course) {
      updateCourse(course.id, payload);
    } else {
      addCourse(payload);
    }
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Course" : "Create New Course"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the course details. These fields power the client portal product card & detail modal."
              : "Fill in the course details. Fields mirror what the client portal renders (per PORTAL_DATA_REQUIREMENTS.md)."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cf-id">Custom Course ID</Label>
              <Input
                id="cf-id"
                value={form.course_id}
                onChange={(e) => set("course_id", e.target.value.toUpperCase().replace(/\s+/g, "-"))}
                placeholder="e.g. STA-101"
                disabled={isEdit}
              />
              {idTaken ? (
                <p className="text-[11px] font-medium text-destructive">This Course ID is already taken.</p>
              ) : form.course_id ? (
                <p className="text-[11px] font-medium text-emerald-600">Course ID is available.</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Unique identifier shown to clients.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-category">Category</Label>
              <Input
                id="cf-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Price Action"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-title">Course Title</Label>
            <Input
              id="cf-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Smart Money Concepts Masterclass"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-desc">Short Description</Label>
            <Textarea
              id="cf-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="One-liner shown on the product card (2-line clamp)."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-long">Full Description</Label>
            <Textarea
              id="cf-long"
              value={form.longDescription}
              onChange={(e) => set("longDescription", e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Full paragraph shown inside the detail modal."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cf-price">Price (INR)</Label>
              <Input
                id="cf-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-start">Start Date &amp; Time</Label>
              <Input
                id="cf-start"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => set("scheduled_at", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cf-lecturer">Lecturer / Lead</Label>
              <Input
                id="cf-lecturer"
                value={form.lecturer}
                onChange={(e) => set("lecturer", e.target.value)}
                placeholder="e.g. Arjun Mehta"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-duration">Duration (Months)</Label>
              <Input
                id="cf-duration"
                type="number"
                min={1}
                value={form.duration_months}
                onChange={(e) => set("duration_months", e.target.value)}
                placeholder="e.g. 6"
              />
              <p className="text-[11px] text-muted-foreground">Course length in whole months.</p>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as Difficulty)}>
                <SelectTrigger id="cf-difficulty" className="w-full">
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
            <p className="text-[11px] text-muted-foreground">
              Exactly 4 inclusions. Shown as tags on the client card and inside the detail modal.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Showcase Image</Label>
            <div className="flex items-start gap-4">
              <label
                htmlFor="cf-image"
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
                id="cf-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex-1 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Used as the card thumbnail and modal hero image. Leave empty to use a generated placeholder.
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
