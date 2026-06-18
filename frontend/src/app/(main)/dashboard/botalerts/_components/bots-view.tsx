"use client";

import * as React from "react";

import {
  Bot as BotIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  EllipsisVertical,
  Pencil,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  formatCurrency,
  useAcademyStore,
  type Bot,
  type BotStatus,
} from "@/lib/academy-store";
import { cn } from "@/lib/utils";

import { BotFormDialog } from "./bot-form-dialog";
import { BotThumb } from "./bot-thumb";

const STATUS_META: Record<BotStatus, { dot: string; label: string; badge: string }> = {
  Running: {
    dot: "bg-emerald-500",
    label: "Running",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  Idle: {
    dot: "bg-muted-foreground",
    label: "Idle",
    badge: "border-border bg-muted text-muted-foreground",
  },
  Paused: {
    dot: "bg-amber-500",
    label: "Paused",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
};

export function BotsView() {
  const bots = useAcademyStore((s) => s.bots);
  const goBotMembers = useAcademyStore((s) => s.goBotMembers);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Bot | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const pageCount = Math.ceil(bots.length / pageSize);
  const pagedBots = bots.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function openEdit(bot: Bot) {
    setEditing(bot);
    setEditOpen(true);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <BotIcon className="size-7 text-primary" />
            Alert Bots
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your automated trading bots — exchange binding, APY, operation status and purchasers.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 hidden">
          <span className="mr-1.5">+</span> New Bot
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader className="pb-0">
          <CardTitle>Automated Bots</CardTitle>
          <CardDescription>
            Server-side bots with API-bound exchange access. Edit a bot or manage its purchasers.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Bot</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Exchange</TableHead>
                  <TableHead className="text-right">APY</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Purchased</TableHead>
                  <TableHead className="w-[64px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedBots.length ? (
                  pagedBots.map((bot, idx) => {
                    const status = STATUS_META[bot.status];
                    return (
                      <TableRow key={bot.id}>
                        <TableCell className="text-center font-mono text-sm text-muted-foreground">
                          {pageIndex * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-10 shrink-0 overflow-hidden rounded-md border">
                              <BotThumb title={bot.title} image={bot.image} category={bot.category} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{bot.title}</p>
                              <p className="font-mono text-[11px] text-muted-foreground">{bot.bot_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-normal">
                            {bot.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge
                            variant="outline"
                            className="gap-1 font-normal border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                          >
                            API Bound: {bot.exchange}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className="font-normal border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          >
                            {bot.apy} APY
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(bot.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("gap-1.5 font-normal", status.badge)}>
                            <span className={cn("size-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={bot.purchased_count > 0 ? "default" : "secondary"}
                            className="tabular-nums"
                          >
                            {bot.purchased_count}
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
                              <DropdownMenuItem onSelect={() => openEdit(bot)}>
                                <Pencil className="mr-2 size-4" />
                                Edit Bot
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => goBotMembers(bot.id)}>
                                <Users className="mr-2 size-4" />
                                Enrolled Members
                                {bot.purchased_count > 0 && (
                                  <Badge variant="secondary" className="ml-auto tabular-nums">
                                    {bot.purchased_count}
                                  </Badge>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      No bots yet. Click <span className="font-medium text-foreground">New Bot</span> to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
            <div className="flex-1 text-muted-foreground text-sm">
              {bots.length} row(s) total.
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

      <BotFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BotFormDialog open={editOpen} onOpenChange={setEditOpen} bot={editing} />
    </div>
  );
}
