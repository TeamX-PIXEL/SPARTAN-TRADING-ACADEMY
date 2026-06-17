"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowLeft, Plus, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

import { batchColumns } from "./batches-columns";
import type { BatchRow } from "./batches-schema";

// Helper type for the template prop
export type BatchTemplateData = {
  min_enroll: number;
  no_of_days: number;
  automated_batch_creation: boolean;
  alert: boolean;
  alert_to: string | null;
};

export function BatchesTable({
  data,
  courseId,
  courseName,
  template,
}: {
  data: BatchRow[];
  courseId: string;
  courseName?: string;
  template?: BatchTemplateData | null;
}) {
  const router = useRouter();

  // Dialog State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [maxDays, setMaxDays] = React.useState("30");

  // Template Settings State
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [minEnroll, setMinEnroll] = React.useState(template?.min_enroll ?? 10);
  const [isAuto, setIsAuto] = React.useState(template?.automated_batch_creation ?? false);
  const [isAlert, setIsAlert] = React.useState(template?.alert ?? false);
  const [alertTo, setAlertTo] = React.useState(template?.alert_to ?? "");

  // ✅ NEW: Synchronize local state whenever the template data from the server updates
  React.useEffect(() => {
    if (template) {
      setMinEnroll(template.min_enroll);
      setIsAuto(template.automated_batch_creation);
      setIsAlert(template.alert);
      setAlertTo(template.alert_to || "");
    }
  }, [template]);

  const table = useReactTable({
    data,
    columns: batchColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  async function handleAddBatch() {
    if (!startDate || !maxDays) return alert("Please fill out all fields.");
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${courseId}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: new Date(startDate).toISOString(),
          max_days: parseInt(maxDays, 10),
        }),
      });

      if (res.ok) {
        setIsAddOpen(false);
        setStartDate("");
        router.refresh();
      }
    } catch (error) {
      console.error("Error API", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/courses/${courseId}/template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_enroll: minEnroll,
          automated_batch_creation: isAuto,
          alert: isAlert,
          alert_to: isAlert ? alertTo : null, // Clear email if alert is turned off
        }),
      });

      if (res.ok) {
        setIsSettingsOpen(false);
        alert("Settings saved successfully!");
        router.refresh(); // This triggers the useEffect to re-sync!
      } else {
        console.error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template", error);
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="size-8" asChild>
            <Link href="/dashboard/academy">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to Courses</span>
            </Link>
          </Button>

          <div className="flex flex-col">
            <CardTitle className="text-l leading-none">Batches</CardTitle>
            <CardDescription className="text-sm mt-0.7">{courseName || courseId}</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-3.5" />
            Add Batch
          </Button>

          <Button variant="ghost" size="icon" aria-label="All Participants" className="size-8" asChild>
            <Link href={`/dashboard/academy/${courseId}/batches/all/participants`}>
              <Users className="size-5 text-muted-foreground" />
            </Link>
          </Button>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Settings" className="size-8">
                <Settings className="size-5 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Batch Automation Settings</DialogTitle>
                <DialogDescription>Configure assignment thresholds and auto-creation rules.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="global-min-capacity" className="font-medium text-sm">
                    Min. number of people to be assigned
                  </Label>
                  <Input
                    id="global-min-capacity"
                    type="number"
                    value={minEnroll}
                    onChange={(e) => setMinEnroll(parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Alert</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to get alert to your mail when it reaches min number of people.
                    </p>
                  </div>
                  <Switch id="global-email-alerts" checked={isAlert} onCheckedChange={setIsAlert} />
                </div>

                {isAlert && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label htmlFor="alert-email" className="font-medium text-sm">
                      Email Address for Alerts
                    </Label>
                    <Input
                      id="alert-email"
                      type="email"
                      placeholder="admin@academy.com"
                      value={alertTo}
                      onChange={(e) => setAlertTo(e.target.value)}
                      className="h-9"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Automated batch creation</Label>
                    <p className="text-xs text-muted-foreground">
                      Will create new batch automatically when it hits min number of people.
                    </p>
                  </div>
                  <Switch id="global-auto-batch" checked={isAuto} onCheckedChange={setIsAuto} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" size="sm" onClick={handleSaveSettings} disabled={isSavingSettings}>
                  {isSavingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={batchColumns.length} className="h-24 text-center">
                    No batches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>Manually spin up a new cohort.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-start-date">Start Date & Time</Label>
              <Input
                id="add-start-date"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-max-days">Duration (Max Days)</Label>
              <Input id="add-max-days" type="number" value={maxDays} onChange={(e) => setMaxDays(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAddBatch} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
