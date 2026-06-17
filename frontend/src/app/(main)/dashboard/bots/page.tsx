"use client";

import { useEffect, useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/api-fetch";

import { getBotColumns } from "./_components/recent-leads-table/columns";
import type { BotRow } from "./_components/recent-leads-table/schema";
import { DataTable } from "./_components/recent-leads-table/table";

const API_URL = "http://127.0.0.1:8000";

export default function Page() {
  const [bots, setBots] = useState<BotRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<BotRow>>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/admin/bots`);
      if (res.status === 401) return;
      if (!res.ok) throw new Error("Failed to fetch bots");
      const data = await res.json();
      setBots(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    try {
      let thumbnailUrl = form.thumbnail || null;

      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("file", thumbnailFile);
        const uploadRes = await fetch(`${API_URL}/api/upload/thumbnail`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          alert(err.detail || "Failed to upload thumbnail");
          return;
        }
        const uploadData = await uploadRes.json();
        thumbnailUrl = uploadData.url;
      }

      if (form.id) {
        const res = await fetchWithAuth(`${API_URL}/api/admin/edit/bot/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: form.display_name,
            description: form.description,
            price: form.price,
            thumbnail: thumbnailUrl,
            telegram_id: form.telegram_id,
            status: form.status,
          }),
        });
        if (res.ok) fetchBots();
      } else {
        const res = await fetchWithAuth(`${API_URL}/api/admin/add/bot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bot_name: form.bot_name || "new_bot",
            display_name: form.display_name || "New Bot",
            description: form.description || "",
            price: form.price || 0,
            thumbnail: thumbnailUrl,
            token_env: form.token_env || "",
            telegram_id: form.telegram_id || null,
            status: form.status || "active",
          }),
        });
        if (res.ok) fetchBots();
      }
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving bot", error);
    }
  };

  const handleDelete = async (bot: BotRow) => {
    if (!confirm(`Are you sure you want to delete ${bot.bot_name}?`)) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/api/admin/delete/bot/${bot.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBots((prev) => prev.filter((b) => b.id !== bot.id));
      }
    } catch (error) {
      console.error("Error deleting bot", error);
    }
  };

  const botColumns = getBotColumns({
    onEdit: (bot: BotRow) => {
      setForm(bot);
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setIsModalOpen(true);
    },
    onDelete: handleDelete,
  });

  return (
    <div className="w-full flex flex-col gap-4 md:gap-6 p-2 md:p-4 overflow-hidden">
      <DataTable
        title="Bots"
        description="Manage your trading bots and view configurations."
        columns={botColumns}
        data={bots}
        rightAction={
          <Button
            size="icon"
            onClick={() => {
              setForm({ status: "active" });
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Bot" : "Create New Bot"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!form.id && (
              <div className="grid gap-2">
                <Label>Bot Name (ID)</Label>
                <Input
                  placeholder="e.g., trend_alert_bot"
                  value={form.bot_name || ""}
                  onChange={(e) => setForm({ ...form, bot_name: e.target.value })}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label>Display Name</Label>
              <Input
                placeholder="e.g., Trend Alert Bot"
                value={form.display_name || ""}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                placeholder="Briefly describe what this bot does"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Thumbnail Image</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setThumbnailFile(file);
                    setThumbnailPreview(URL.createObjectURL(file));
                  }
                }}
                className="file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
              />
              {(thumbnailPreview || form.thumbnail) && (
                <div className="relative mt-2">
                  <img
                    src={thumbnailPreview || form.thumbnail || ""}
                    alt="Preview"
                    className="w-full h-24 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailFile(null);
                      setThumbnailPreview(null);
                      setForm({ ...form, thumbnail: null });
                    }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                  >
                    X
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  placeholder="49.99"
                  value={form.price || ""}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                />
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val: any) => setForm({ ...form, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Token Environment Variable</Label>
              <Input
                placeholder="e.g., TREND_BOT_TOKEN"
                value={form.token_env || ""}
                onChange={(e) => setForm({ ...form, token_env: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Telegram ID (Optional)</Label>
              <Input
                placeholder="e.g., @my_alerts_channel"
                value={form.telegram_id || ""}
                onChange={(e) => setForm({ ...form, telegram_id: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Bot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
