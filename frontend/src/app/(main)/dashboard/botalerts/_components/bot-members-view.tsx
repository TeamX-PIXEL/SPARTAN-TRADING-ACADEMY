"use client";

import * as React from "react";

import {
  ArrowLeft,
  Bot as BotIcon,
  Calendar,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Edit,
  Gift,
  IndianRupee,
  Loader2,
  Mail,
  Search,
  Send,
  UserPlus,
  Users,
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
  useAcademyStore,
  type AccessType,
  type Bot,
  type Member,
} from "@/lib/academy-store";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

interface Props {
  bot: Bot | undefined;
}

interface SearchResult {
  id: number;
  name: string;
  email: string;
  username: string;
  tvid: string;
}

export function BotMembersView({ bot }: Props) {
  const members = useAcademyStore((s) => s.members);
  const goBots = useAcademyStore((s) => s.goBots);
  const fetchBotMembers = useAcademyStore((s) => s.fetchBotMembers);
  const addBotMember = useAcademyStore((s) => s.addBotMember);
  const updateBotMemberExpiry = useAcademyStore((s) => s.updateBotMemberExpiry);

  const [addOpen, setAddOpen] = React.useState(false);
  const [expiryEditOpen, setExpiryEditOpen] = React.useState(false);
  const [expiryEditMember, setExpiryEditMember] = React.useState<Member | null>(null);
  const [expiryValue, setExpiryValue] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<SearchResult | null>(null);
  const [accessType, setAccessType] = React.useState<AccessType>("free");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("Card");
  const [saving, setSaving] = React.useState(false);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    if (bot) fetchBotMembers(bot.id);
  }, [bot, fetchBotMembers]);

  const botMembers = React.useMemo(
    () => (bot ? members.filter((m) => m.botId === bot.id) : []),
    [members, bot],
  );

  const pageCount = Math.ceil(botMembers.length / pageSize);
  const pagedMembers = botMembers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  const paid = botMembers.filter((m) => m.accessType === "paid").length;
  const free = botMembers.filter((m) => m.accessType === "free").length;

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }

  function handleSelectUser(user: SearchResult) {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery(`@${user.username}`);
  }

  function handleOpenAdd() {
    setSelectedUser(null);
    setSearchQuery("");
    setSearchResults([]);
    setAccessType("free");
    setAmount("");
    setMethod("Card");
    setAddOpen(true);
  }

  async function handleAdd() {
    if (!selectedUser || !bot) return;
    setSaving(true);
    const result = await addBotMember(bot.id, {
      username: selectedUser.username,
      expiry: undefined,
      amount: accessType === "paid" ? Number(amount) : 0,
      method: accessType === "paid" ? method : "Free",
    });
    setSaving(false);
    if (result) {
      setAddOpen(false);
      setSelectedUser(null);
      setSearchQuery("");
      toast.success(`${selectedUser.name} was enrolled with ${accessType} access.`);
    } else {
      toast.error("Failed to enrol member.");
    }
  }

  function handleOpenExpiryEdit(member: Member) {
    setExpiryEditMember(member);
    setExpiryValue(member.botExpiry || "");
    setExpiryEditOpen(true);
  }

  async function handleSaveExpiry() {
    if (!expiryEditMember) return;
    const result = await updateBotMemberExpiry(expiryEditMember.id, expiryValue || "");
    if (result) {
      setExpiryEditOpen(false);
      toast.success(`Expiry updated for ${expiryEditMember.name}.`);
    } else {
      toast.error("Failed to update expiry.");
    }
  }

  if (!bot) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-muted-foreground">Bot not found.</p>
        <Button variant="outline" onClick={goBots}>
          <ArrowLeft className="mr-2 size-4" /> Back to Alert Bots
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground" onClick={goBots}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Alert Bots
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Users className="size-6 text-primary" />
              Enrolled Members
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{bot.title}</span>{" "}
              <span className="font-mono text-[11px]">({bot.bot_id})</span> — manage purchaser access and
              contact details.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Members" value={botMembers.length} icon={<Users className="size-4" />} />
        <StatCard label="Paid Access" value={paid} accent="emerald" />
        <StatCard label="Free Access" value={free} accent="amber" icon={<Gift className="size-4" />} />
        <StatCard label="Active Bots" value={botMembers.length} accent="blue" icon={<BotIcon className="size-4" />} />
      </div>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
          <div className="flex flex-col space-y-1 overflow-hidden">
            <CardTitle className="truncate">Enrolled Members</CardTitle>
            <CardDescription className="hidden truncate sm:block">
              Manage purchaser access and contact details for this bot.
            </CardDescription>
          </div>
          <Button onClick={handleOpenAdd} className="shrink-0 gap-1.5">
            <UserPlus className="size-4" />
            Add Client
          </Button>
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
                    <TableHead className="text-center">Access</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                    <TableHead className="hidden md:table-cell">Bot Expiry</TableHead>
                    <TableHead className="w-[64px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedMembers.length ? (
                    pagedMembers.map((m, idx) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-center font-mono text-sm text-muted-foreground">
                          {pageIndex * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {(m.firstname || m.name).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{m.name}</p>
                              <p className="text-[11px] text-muted-foreground">@{m.username || "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-sm">
                            <Mail className="size-3.5 text-muted-foreground" />
                            {m.email}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {m.accessType === "free" ? (
                            <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 font-normal text-amber-700 dark:text-amber-300">
                              <Gift className="size-3" />
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-700 dark:text-emerald-300">
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">{formatDate(m.joinedAt)}</TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            {formatDate(m.botExpiry) || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenExpiryEdit(m)}
                          >
                            <Edit className="size-4" />
                            <span className="sr-only">Edit Expiry</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                        No members enrolled yet. Click <span className="font-medium text-foreground">Add Client</span> to grant free access.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 text-muted-foreground text-sm">
                {botMembers.length} row(s) total.
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" /> Add Client
            </DialogTitle>
            <DialogDescription>
              Grant a client access to <span className="font-medium text-foreground">{bot.title}</span>. Search
              by @username to find a registered user.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bm-search">Search User</Label>
              <div className="flex gap-2">
                <Input
                  id="bm-search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedUser(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="@username"
                />
                <Button variant="outline" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && !selectedUser && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    onClick={() => handleSelectUser(u)}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">@{u.username} · {u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{selectedUser.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">@{selectedUser.username} · {selectedUser.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setSearchQuery(""); }}>
                  Change
                </Button>
              </div>
            )}

            {selectedUser && (
              <div className="space-y-2">
                <Label>Access Type</Label>
                <Select value={accessType} onValueChange={(v) => setAccessType(v as AccessType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">
                      <span className="flex items-center gap-2">
                        <Gift className="size-4 text-amber-600" /> Free Access (Admin Granted)
                      </span>
                    </SelectItem>
                    <SelectItem value="paid">
                      <span className="flex items-center gap-2">
                        <Send className="size-4 text-emerald-600" /> Paid Access
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedUser && accessType === "paid" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bm-amount">Amount (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="bm-amount"
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedUser || saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving ? "Adding..." : "Enrol Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expiryEditOpen} onOpenChange={setExpiryEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5" /> Edit Bot Expiry
            </DialogTitle>
            <DialogDescription>
              Set the bot access expiry for <span className="font-medium text-foreground">{expiryEditMember?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="space-y-2">
              <Label>Bot Expiry Date</Label>
              <Input
                type="date"
                value={expiryValue}
                onChange={(e) => setExpiryValue(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Current: {expiryEditMember?.botExpiry ? formatDate(expiryEditMember.botExpiry) : "No expiry set"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveExpiry}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = "neutral",
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  accent?: "neutral" | "emerald" | "amber" | "violet" | "blue";
}) {
  const accents: Record<string, string> = {
    neutral: "text-foreground",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    violet: "text-violet-700 dark:text-violet-300",
    blue: "text-blue-700 dark:text-blue-300",
  };
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${accents[accent]}`}>{value}</p>
    </div>
  );
}
