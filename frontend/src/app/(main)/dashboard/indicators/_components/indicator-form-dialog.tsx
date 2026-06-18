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
import {
  useAcademyStore,
  type Indicator,
  type IndicatorStatus,
} from "@/lib/academy-store";

interface IndicatorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator?: Indicator | null;
}

interface FormState {
  indicator_id: string;
  title: string;
  description: string;
  longDescription: string;
  price: string;
  category: string;
  features: string[];
  scriptType: string;
  accuracy: string;
  timeframe: string;
  pine_id: string;
  session_id: string;
  status: IndicatorStatus;
  image: string;
}

const EMPTY: FormState = {
  indicator_id: "",
  title: "",
  description: "",
  longDescription: "",
  price: "0",
  category: "",
  features: ["", "", "", ""],
  scriptType: "Pine Script (v6)",
  accuracy: "",
  timeframe: "",
  pine_id: "",
  session_id: "",
  status: "unavailable",
  image: "",
};

const STATUS_OPTIONS: { value: IndicatorStatus; label: string }[] = [
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
  { value: "unavailable", label: "Unavailable" },
];

export function IndicatorFormDialog({ open, onOpenChange, indicator }: IndicatorFormDialogProps) {
  const addIndicator = useAcademyStore((s) => s.addIndicator);
  const updateIndicator = useAcademyStore((s) => s.updateIndicator);

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [idTaken, setIdTaken] = React.useState(false);

  const isEdit = Boolean(indicator);

  React.useEffect(() => {
    if (!open) return;
    if (indicator) {
      setForm({
        indicator_id: indicator.indicator_id,
        title: indicator.title,
        description: indicator.description,
        longDescription: indicator.longDescription,
        price: String(indicator.price),
        category: indicator.category,
        features: [
          indicator.features[0] ?? "",
          indicator.features[1] ?? "",
          indicator.features[2] ?? "",
          indicator.features[3] ?? "",
        ],
        scriptType: indicator.scriptType || "Pine Script (v6)",
        accuracy: indicator.accuracy,
        timeframe: indicator.timeframe,
        pine_id: indicator.pine_id ?? "",
        session_id: indicator.session_id ?? "",
        status: indicator.status,
        image: indicator.image,
      });
      setImagePreview(indicator.image || null);
      setIdTaken(false);
    } else {
      setForm(EMPTY);
      setImagePreview(null);
      setIdTaken(false);
    }
  }, [open, indicator]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const indicators = useAcademyStore((s) => s.indicators);
  React.useEffect(() => {
    if (!form.indicator_id) {
      setIdTaken(false);
      return;
    }
    const clash = indicators.some(
      (i) =>
        i.indicator_id.toLowerCase() === form.indicator_id.toLowerCase() &&
        i.id !== indicator?.id,
    );
    setIdTaken(clash);
  }, [form.indicator_id, indicators, indicator?.id]);

  const valid = form.indicator_id.trim() && form.title.trim() && form.price.trim() && !idTaken;

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
      indicator_id: form.indicator_id.trim().toUpperCase().replace(/\s+/g, "-"),
      title: form.title.trim(),
      description: form.description.trim(),
      longDescription: form.longDescription.trim(),
      price: parseFloat(form.price) || 0,
      image: form.image,
      category: form.category.trim() || "General",
      features: form.features.map((f) => f.trim()).filter(Boolean),
      scriptType: form.scriptType.trim() || "Pine Script (v6)",
      accuracy: form.accuracy.trim() || "—",
      timeframe: form.timeframe.trim() || "—",
      pine_id: form.pine_id.trim() || null,
      session_id: form.session_id.trim() || null,
      expiry_period: "1M" as const,
      status: form.status,
    };

    if (isEdit && indicator) {
      updateIndicator(indicator.id, payload);
    } else {
      addIndicator(payload);
    }
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Indicator" : "Create New Indicator"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the indicator details. These fields power the client portal product card & detail modal."
              : "Fill in the indicator details. Fields mirror what the client portal renders (per PORTAL_DATA_REQUIREMENTS.md)."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="if-id">Custom Indicator ID</Label>
              <Input
                id="if-id"
                value={form.indicator_id}
                onChange={(e) => set("indicator_id", e.target.value.toUpperCase().replace(/\s+/g, "-"))}
                placeholder="e.g. IND-201"
                disabled={isEdit}
              />
              {idTaken ? (
                <p className="text-[11px] font-medium text-destructive">This Indicator ID is already taken.</p>
              ) : form.indicator_id ? (
                <p className="text-[11px] font-medium text-emerald-600">Indicator ID is available.</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Unique identifier shown to clients.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="if-category">Category</Label>
              <Input
                id="if-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Price Action"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="if-title">Indicator Name</Label>
            <Input
              id="if-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Liquidity Sweep Detector"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="if-desc">Short Description</Label>
            <Textarea
              id="if-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="One-liner shown on the product card (2-line clamp)."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="if-long">Full Description</Label>
            <Textarea
              id="if-long"
              value={form.longDescription}
              onChange={(e) => set("longDescription", e.target.value)}
              rows={3}
              className="resize-none"
              placeholder="Full paragraph shown inside the detail modal."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="if-price">Price (INR)</Label>
              <Input
                id="if-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="if-script">Script Type</Label>
              <Input
                id="if-script"
                value={form.scriptType}
                onChange={(e) => set("scriptType", e.target.value)}
                placeholder="e.g. Pine Script (v5)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="if-accuracy">Accuracy</Label>
              <Input
                id="if-accuracy"
                value={form.accuracy}
                onChange={(e) => set("accuracy", e.target.value)}
                placeholder="e.g. 87.4%"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="if-timeframe">Recommended Timeframes</Label>
              <Input
                id="if-timeframe"
                value={form.timeframe}
                onChange={(e) => set("timeframe", e.target.value)}
                placeholder="e.g. 5m, 1h, Daily"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as IndicatorStatus)}>
                <SelectTrigger id="if-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="if-pine">Pine ID (optional)</Label>
              <Input
                id="if-pine"
                value={form.pine_id}
                onChange={(e) => set("pine_id", e.target.value)}
                placeholder="e.g. PUB-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="if-session">Session ID (optional)</Label>
              <Input
                id="if-session"
                value={form.session_id}
                onChange={(e) => set("session_id", e.target.value)}
                placeholder="TradingView Session ID"
              />
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
                    "e.g. Real-time Sweep Alerts",
                    "e.g. Multi-Timeframe Dashboard",
                    "e.g. Order Block Marking",
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
                htmlFor="if-image"
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
                id="if-image"
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
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create indicator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
