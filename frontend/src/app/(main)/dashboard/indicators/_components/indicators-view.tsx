"use client";

import * as React from "react";

import {
  AlertCircle,
  BarChart3,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EllipsisVertical,
  Lock,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatCurrency,
  useAcademyStore,
  type Indicator,
  type IndicatorStatus,
} from "@/lib/academy-store";
import { cn } from "@/lib/utils";

import { IndicatorFormDialog } from "./indicator-form-dialog";
import { IndicatorThumb } from "./indicator-thumb";

const STATUS_META: Record<
  IndicatorStatus,
  { dot: string; label: string; badge: string }
> = {
  running: {
    dot: "bg-emerald-500",
    label: "Running",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  paused: {
    dot: "bg-amber-500",
    label: "Paused",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  unavailable: {
    dot: "bg-rose-500",
    label: "Unavailable",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

export function IndicatorsView() {
  const indicators = useAcademyStore((s) => s.indicators);
  const fetchIndicators = useAcademyStore((s) => s.fetchIndicators);
  const removeIndicator = useAcademyStore((s) => s.removeIndicator);
  const goIndicatorMembers = useAcademyStore((s) => s.goIndicatorMembers);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Indicator | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  const pageCount = Math.ceil(indicators.length / pageSize);
  const pagedIndicators = indicators.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function openEdit(indicator: Indicator) {
    setEditing(indicator);
    setEditOpen(true);
  }

  async function handleRemove(indicator: Indicator) {
    if (indicator.purchased_count > 0) {
      toast.error(`Cannot remove indicator — ${indicator.title} has ${indicator.purchased_count} purchaser(s). Remove members first.`);
      return;
    }
    const ok = await removeIndicator(indicator.indicator_id);
    if (ok) {
      toast.success(`Indicator removed — ${indicator.indicator_id} — ${indicator.title} was deleted.`);
    } else {
      toast.error("Failed to remove indicator.");
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <BarChart3 className="size-7 text-primary" />
            Indicators
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your Pine Script indicators — pricing, status and purchasers.
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
          <div className="flex flex-col space-y-1 overflow-hidden">
            <CardTitle className="truncate">Indicator Modules</CardTitle>
            <CardDescription className="hidden truncate sm:block">
              Institutional technical indicators. Edit details, manage purchasers or remove an indicator no
              one has bought yet.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-1.5">
            <span>+</span> New Indicator
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Indicator</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Script</TableHead>
                  <TableHead className="hidden xl:table-cell">Timeframes</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Purchased</TableHead>
                  <TableHead className="w-[64px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedIndicators.length ? (
                  pagedIndicators.map((indicator, idx) => {
                    const status = STATUS_META[indicator.status];
                    return (
                      <TableRow key={indicator.id}>
                        <TableCell className="text-center font-mono text-sm text-muted-foreground">
                          {pageIndex * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 shrink-0 overflow-hidden rounded-md border">
                              <IndicatorThumb
                                title={indicator.title}
                                image={indicator.image}
                                category={indicator.category}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{indicator.title}</p>
                              <p className="font-mono text-[11px] text-muted-foreground">
                                {indicator.indicator_id} · {indicator.accuracy}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-normal">
                            {indicator.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-sm lg:table-cell">{indicator.scriptType}</TableCell>
                        <TableCell className="hidden text-sm xl:table-cell">{indicator.timeframe}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(indicator.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("gap-1.5 font-normal", status.badge)}>
                            <span className={cn("size-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={indicator.purchased_count > 0 ? "default" : "secondary"}
                            className="tabular-nums"
                          >
                            {indicator.purchased_count}
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
                              <DropdownMenuItem onSelect={() => openEdit(indicator)}>
                                <Pencil className="mr-2 size-4" />
                                Edit Indicator
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => goIndicatorMembers(indicator.id)}>
                                <Users className="mr-2 size-4" />
                                Enrolled Members
                                {indicator.purchased_count > 0 && (
                                  <Badge variant="secondary" className="ml-auto tabular-nums">
                                    {indicator.purchased_count}
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {indicator.purchased_count === 0 ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => handleRemove(indicator)}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Remove
                                </DropdownMenuItem>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="flex w-full cursor-not-allowed items-center px-2 py-1.5 text-sm text-muted-foreground opacity-60"
                                        role="menuitem"
                                        aria-disabled
                                      >
                                        <Lock className="mr-2 size-4" />
                                        Remove
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      <p className="flex items-center gap-1.5 text-xs">
                                        <AlertCircle className="size-3" />
                                        Locked — {indicator.purchased_count} member(s) enrolled
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      No indicators yet. Click <span className="font-medium text-foreground">New Indicator</span> to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
            <div className="flex-1 text-muted-foreground text-sm">
              {indicators.length} row(s) total.
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
        </CardContent>
      </Card>

      <IndicatorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <IndicatorFormDialog open={editOpen} onOpenChange={setEditOpen} indicator={editing} />
    </div>
  );
}
