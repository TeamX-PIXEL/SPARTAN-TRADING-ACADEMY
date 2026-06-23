"use client";

import * as React from "react";

import {
  ArrowLeft,
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
  MessageSquare,
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
  type Course,
  type Member,
} from "@/lib/academy-store";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

interface Props {
  course: Course | undefined;
}

interface SearchResult {
  id: number;
  name: string;
  email: string;
  username: string;
  tvid: string;
}

export function EnrolledMembersView({ course }: Props) {
  const members = useAcademyStore((s) => s.members);
  const goAcademy = useAcademyStore((s) => s.goAcademy);
  const addMember = useAcademyStore((s) => s.addMember);
  const fetchMembers = useAcademyStore((s) => s.fetchMembers);
  const updateMemberExpiry = useAcademyStore((s) => s.updateMemberExpiry);

  const [addOpen, setAddOpen] = React.useState(false);
  const [discordEditOpen, setDiscordEditOpen] = React.useState(false);
  const [discordEditMember, setDiscordEditMember] = React.useState<Member | null>(null);
  const [discordExpiry, setDiscordExpiry] = React.useState("");
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
    if (course) {
      fetchMembers(course.course_id);
    }
  }, [course, fetchMembers]);

  const courseMembers = React.useMemo(
    () => (course ? members.filter((m) => m.courseId === course?.id) : []),
    [members, course],
  );

  const pageCount = Math.ceil(courseMembers.length / pageSize);
  const pagedMembers = courseMembers.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  const paid = courseMembers.filter((m) => m.accessType === "paid").length;
  const free = courseMembers.filter((m) => m.accessType === "free").length;

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
    if (!selectedUser || !course) return;
    setSaving(true);
    const member = await addMember(course.course_id, {
      username: selectedUser.username,
      expiry: undefined,
      amount: accessType === "paid" ? Number(amount) : 0,
      method: accessType === "paid" ? method : "Free",
    });
    setSaving(false);
    setAddOpen(false);
    setSelectedUser(null);
    setSearchQuery("");
    if (member) {
      toast.success(`${selectedUser.name} was enrolled with ${accessType} access.`);
    } else {
      toast.error("Failed to enrol member.");
    }
  }

  function handleOpenDiscordEdit(member: Member) {
    setDiscordEditMember(member);
    if (member.discordExpiry) {
      const d = new Date(member.discordExpiry);
      setDiscordExpiry(d.toISOString().split("T")[0]);
    } else {
      setDiscordExpiry("");
    }
    setDiscordEditOpen(true);
  }

  async function handleSaveDiscordEdit() {
    if (!discordEditMember) return;
    await updateMemberExpiry(discordEditMember.id, discordExpiry);
    setDiscordEditOpen(false);
    toast.success(`Discord expiry updated for ${discordEditMember.name}.`);
  }

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

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground" onClick={goAcademy}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Academy
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Users className="size-6 text-primary" />
              Enrolled Members
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{course.title}</span>{" "}
              <span className="font-mono text-[11px]">({course.course_id})</span> — manage client access and
              contact details.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Members" value={courseMembers.length} icon={<Users className="size-4" />} />
        <StatCard label="Paid Access" value={paid} accent="emerald" />
        <StatCard label="Free Access" value={free} accent="amber" icon={<Gift className="size-4" />} />
        <StatCard label="With Discord" value={courseMembers.filter((m) => m.discordExpiry).length} accent="violet" icon={<MessageSquare className="size-4" />} />
      </div>

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
          <div className="flex flex-col space-y-1 overflow-hidden">
            <CardTitle className="truncate">Enrolled Members</CardTitle>
            <CardDescription className="hidden truncate sm:block">
              Manage client access and contact details for this course.
            </CardDescription>
          </div>
          {course.status === "upcoming" && (
            <Button onClick={handleOpenAdd} className="shrink-0 gap-1.5">
              <UserPlus className="size-4" />
              Add Client
            </Button>
          )}
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
                            <Calendar className="size-3.5 text-muted-foreground" />
                            {formatDate(m.discordExpiry) || "—"}
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
                        No members enrolled yet. Click <span className="font-medium text-foreground">Add Client</span> to grant free access.
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
              Enrol a client into <span className="font-medium text-foreground">{course.title}</span>. Search
              by @username to find a registered user.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="c-search">Search User</Label>
              <div className="flex gap-2">
                <Input
                  id="c-search"
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
                  <Label htmlFor="c-amount">Amount (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="c-amount"
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

      <Dialog open={discordEditOpen} onOpenChange={setDiscordEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5" /> Edit Discord Expiry
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
                Current: {discordEditMember?.discordExpiry ? formatDate(discordEditMember.discordExpiry) : "No expiry set"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscordEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDiscordEdit}>
              Save
            </Button>
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
  accent?: "neutral" | "emerald" | "amber" | "violet";
}) {
  const accents: Record<string, string> = {
    neutral: "text-foreground",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
    violet: "text-violet-700 dark:text-violet-300",
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
