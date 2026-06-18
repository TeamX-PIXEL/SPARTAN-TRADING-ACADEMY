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
  type Bot,
  type BotStatus,
} from "@/lib/academy-store";

interface BotFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot?: Bot | null;
}

interface FormState {
  bot_id: string;
  title: string;
  description: string;
  longDescription: string;
  price: string;
  category: string;
  features: string[];
  exchange: string;
  apy: string;
  status: BotStatus;
  apiKey: string;
  telegram_id: string;
  token_env: string;
  image: string;
}

const EMPTY: FormState = {
  bot_id: "",
  title: "",
  description: "",
  longDescription: "",
  price: "0",
  category: "",
  features: ["", "", "", ""],
  exchange: "Binance",
  apy: "",
  status: "Idle",
  apiKey: "",
  telegram_id: "",
  token_env: "",
  image: "",
};

const STATUS_OPTIONS: { value: BotStatus; label: string }[] = [
  { value: "Running", label: "Running" },
  { value: "Idle", label: "Idle" },
  { value: "Paused", label: "Paused" },
];

export function BotFormDialog({ open, onOpenChange, bot }: BotFormDialogProps) {
  const addBot = useAcademyStore((s) => s.addBot);
  const updateBot = useAcademyStore((s) => s.updateBot);

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [idTaken, setIdTaken] = React.useState(false);

  const isEdit = Boolean(bot);

  React.useEffect(() => {
    if (!open) return;
    if (bot) {
      setForm({
        bot_id: bot.bot_id,
        title: bot.title,
        description: bot.description,
        longDescription: bot.longDescription,
        price: String(bot.price),
        category: bot.category,
        features: [
          bot.features[0] ?? "",
          bot.features[1] ?? "",
          bot.features[2] ?? "",
          bot.features[3] ?? "",
        ],
        exchange: bot.exchange,
        apy: bot.apy,
        status: bot.status,
        apiKey: bot.apiKey ?? "",
        telegram_id: bot.telegram_id ?? "",
        token_env: bot.token_env ?? "",
        image: bot.image,
      });
      setImagePreview(bot.image || null);
      setIdTaken(false);
    } else {
      setForm(EMPTY);
      setImagePreview(null);
      setIdTaken(false);
    }
  }, [open, bot]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const bots = useAcademyStore((s) => s.bots);
  React.useEffect(() => {
    if (!form.bot_id) {
      setIdTaken(false);
      return;
    }
    const clash = bots.some(
      (b) => b.bot_id.toLowerCase() === form.bot_id.toLowerCase() && b.id !== bot?.id,
    );
    setIdTaken(clash);
  }, [form.bot_id, bots, bot?.id]);

  const valid = form.bot_id.trim() && form.title.trim() && form.price.trim() && !idTaken;

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
      bot_id: form.bot_id.trim().toUpperCase().replace(/\s+/g, "-"),
      title: form.title.trim(),
      description: form.description.trim(),
      longDescription: form.longDescription.trim(),
      price: parseFloat(form.price) || 0,
      image: form.image,
      category: form.category.trim() || "General",
      features: form.features.map((f) => f.trim()).filter(Boolean),
      exchange: form.exchange.trim() || "Binance",
      apy: form.apy.trim() || "—",
      status: form.status,
      apiKey: form.apiKey.trim() || undefined,
      telegram_id: form.telegram_id.trim() || undefined,
      token_env: form.token_env.trim() || undefined,
    };

    if (isEdit && bot) {
      updateBot(bot.id, payload);
    } else {
      addBot(payload);
    }
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Bot" : "Create New Bot"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the bot details. These fields power the client portal product card & detail modal."
              : "Fill in the bot details. Fields mirror what the client portal renders (per PORTAL_DATA_REQUIREMENTS.md)."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bf-id">Custom Bot ID</Label>
              <Input
                id="bf-id"
                value={form.bot_id}
                onChange={(e) => set("bot_id", e.target.value.toUpperCase().replace(/\s+/g, "-"))}
                placeholder="e.g. BOT-301"
                disabled={isEdit}
              />
              {idTaken ? (
                <p className="text-[11px] font-medium text-destructive">This Bot ID is already taken.</p>
              ) : form.bot_id ? (
                <p className="text-[11px] font-medium text-emerald-600">Bot ID is available.</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Unique identifier shown to clients.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-category">Category</Label>
              <Input
                id="bf-category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Grid"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bf-title">Bot Name</Label>
            <Input
              id="bf-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Grid Hunter Pro"
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
              placeholder="One-liner shown on the product card (2-line clamp)."
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
              placeholder="Full paragraph shown inside the detail modal."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
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
              <Label htmlFor="bf-exchange">Target Exchange</Label>
              <Input
                id="bf-exchange"
                value={form.exchange}
                onChange={(e) => set("exchange", e.target.value)}
                placeholder="e.g. Binance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-apy">Historical Return APY</Label>
              <Input
                id="bf-apy"
                type="number"
                min={0}
                value={form.apy}
                onChange={(e) => set("apy", e.target.value)}
                placeholder="e.g. 142"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Operation Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as BotStatus)}>
                <SelectTrigger id="bf-status" className="w-full">
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
            <div className="space-y-2">
              <Label htmlFor="bf-token">Bot Token</Label>
              <Input
                id="bf-token"
                value={form.token_env}
                onChange={(e) => set("token_env", e.target.value)}
                placeholder="e.g. GRID_HUNTER_TOKEN"
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
                    "e.g. Adaptive Grid Spacing",
                    "e.g. Drawdown Protection",
                    "e.g. Telegram Alert Channel",
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
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
