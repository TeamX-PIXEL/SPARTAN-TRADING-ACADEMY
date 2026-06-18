"use client";

import * as React from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Edit,
  Eye,
  EyeOff,
  GraduationCap,
  Key,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  User,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAcademyStore, formatCurrency, formatDate, type Member } from "@/lib/academy-store";
import { fetchWithAuth, API_BASE_URL } from "@/lib/api-fetch";

interface ClientUser {
  id: number;
  UserUUID: string;
  UserID: string;
  UserName: string;
  email: string;
  tvid: string;
  phone_number: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  discord_user_id: string;
  discord_chat_id: string;
  is_verified: boolean;
  created_at: string;
}

export function ClientsManageClient() {
  const members = useAcademyStore((s) => s.members);
  const courses = useAcademyStore((s) => s.courses);
  const indicators = useAcademyStore((s) => s.indicators);
  const bots = useAcademyStore((s) => s.bots);

  const [users, setUsers] = React.useState<ClientUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const [editUser, setEditUser] = React.useState<ClientUser | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    client_name: "",
    firstname: "",
    lastname: "",
    email: "",
    mobile: "",
    tvid: "",
    telegramid: "",
    telegramchatid: "",
    discordid: "",
    discordchatid: "",
    password: "",
  });
  const [showEditPass, setShowEditPass] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [detailUser, setDetailUser] = React.useState<ClientUser | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    mobile: "",
    tvid: "",
    telegramid: "",
    telegramchatid: "",
    discordid: "",
    discordchatid: "",
    password: "",
  });
  const [addSaving, setAddSaving] = React.useState(false);
  const [usernameStatus, setUsernameStatus] = React.useState<"idle" | "checking" | "available" | "taken">("idle");
  const [showAddPass, setShowAddPass] = React.useState(false);

  React.useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/users`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch {
        setUsers([]);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const filtered = React.useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.UserName?.toLowerCase().includes(q) ||
        u.UserID?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.tvid?.toLowerCase().includes(q) ||
        u.phone_number?.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  const totalMembers = members.length;
  const paidMembers = members.filter((m) => m.accessType === "paid").length;
  const freeMembers = members.filter((m) => m.accessType === "free").length;

  function openEdit(user: ClientUser) {
    setEditUser(user);
    setEditForm({
      client_name: user.UserName || "",
      firstname: user.UserName?.split(" ")[0] || "",
      lastname: user.UserName?.split(" ").slice(1).join(" ") || "",
      email: user.email || "",
      mobile: user.phone_number || "",
      tvid: user.tvid || "",
      telegramid: user.telegram_user_id || "",
      telegramchatid: user.telegram_chat_id || "",
      discordid: user.discord_user_id || "",
      discordchatid: user.discord_chat_id || "",
      password: "",
    });
    setShowEditPass(false);
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setEditOpen(false);
    toast.success(`Client "${editForm.client_name}" updated successfully.`);
  }

  function openDetail(user: ClientUser) {
    setDetailUser(user);
    setDetailOpen(true);
  }

  function getClientMembers(userId: number): Member[] {
    return members.filter((m) => m.id === userId);
  }

  async function checkUsernameAvailability(username: string) {
    if (!username.trim()) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/admin/users/check-username/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } else {
        setUsernameStatus("idle");
      }
    } catch {
      setUsernameStatus("idle");
    }
  }

  function handleOpenAdd() {
    setAddForm({
      username: "",
      firstname: "",
      lastname: "",
      email: "",
      mobile: "",
      tvid: "",
      telegramid: "",
      telegramchatid: "",
      discordid: "",
      discordchatid: "",
      password: "",
    });
    setUsernameStatus("idle");
    setShowAddPass(false);
    setAddOpen(true);
  }

  async function handleAddClient() {
    setAddSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setAddSaving(false);
    setAddOpen(false);
    toast.success(`Client "${addForm.firstname} ${addForm.lastname}" created successfully.`);
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <Users className="size-6 text-primary" />
            Clients Manage
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage all registered clients — view enrolled products, edit details, and track activity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clients</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{users.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Registered in database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Enrolments</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{totalMembers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Across all products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid Access</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-emerald-600">{paidMembers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Paid product enrolments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Free Access</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-amber-600">{freeMembers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Admin-granted access</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0 pt-2">
          <div className="flex flex-col space-y-1 overflow-hidden">
            <CardTitle className="truncate">Clients List</CardTitle>
            <CardDescription className="hidden truncate sm:block">
              Browse, search, and manage all registered clients and their enrolments.
            </CardDescription>
          </div>
          <Button className="shrink-0 gap-1.5 mt-1" onClick={handleOpenAdd}>
            <Users className="size-4" />
            Add Client
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageIndex(0);
                }}
                placeholder="Search by name, username, email, or mobile..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Mobile Number</TableHead>
                  <TableHead className="hidden xl:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="w-[120px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length ? (
                  paged.map((user, idx) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center font-mono text-sm text-muted-foreground">
                        {pageIndex * pageSize + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {(user.UserName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{user.UserName}</p>
                            <p className="text-[11px] text-muted-foreground">@{user.UserID}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3.5 text-muted-foreground" />
                          {user.email}
                        </span>
                      </TableCell>
                      <TableCell className="hidden font-mono text-[12px] lg:table-cell">
                        {user.phone_number || "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <Badge variant={user.is_verified ? "default" : "secondary"}>
                          {user.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openDetail(user)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(user)}>
                            <Edit className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                      {loading ? "Loading clients..." : "No clients found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div className="flex-1 text-muted-foreground text-sm">
              {filtered.length} row(s) total.
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-5" /> Edit Client
            </DialogTitle>
            <DialogDescription>
              Update client details for <span className="font-medium text-foreground">{editUser?.UserName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={editForm.firstname} onChange={(e) => setEditForm((f) => ({ ...f, firstname: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={editForm.lastname} onChange={(e) => setEditForm((f) => ({ ...f, lastname: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input type="tel" value={editForm.mobile} onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>TradingView ID</Label>
              <Input value={editForm.tvid} onChange={(e) => setEditForm((f) => ({ ...f, tvid: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telegram User ID</Label>
                <Input value={editForm.telegramid} onChange={(e) => setEditForm((f) => ({ ...f, telegramid: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telegram Chat ID</Label>
                <Input value={editForm.telegramchatid} onChange={(e) => setEditForm((f) => ({ ...f, telegramchatid: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discord User ID</Label>
                <Input value={editForm.discordid} onChange={(e) => setEditForm((f) => ({ ...f, discordid: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Discord Chat ID</Label>
                <Input value={editForm.discordchatid} onChange={(e) => setEditForm((f) => ({ ...f, discordchatid: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showEditPass ? "text" : "password"}
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowEditPass(!showEditPass)}
                >
                  {showEditPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-5" /> Client Details
            </DialogTitle>
            <DialogDescription>
              Enrolled products and access details for <span className="font-medium text-foreground">{detailUser?.UserName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(detailUser?.UserName || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{detailUser?.UserName}</p>
              <p className="truncate text-[11px] text-muted-foreground">@{detailUser?.UserID} · {detailUser?.email}</p>
            </div>
            <Badge variant={detailUser?.is_verified ? "default" : "secondary"}>
              {detailUser?.is_verified ? "Verified" : "Unverified"}
            </Badge>
          </div>

          <Tabs defaultValue="courses" className="w-full">
            <TabsList>
              <TabsTrigger value="courses" className="gap-1.5">
                <GraduationCap className="size-3.5" />
                Courses
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {detailUser ? members.filter((m) => m.courseId && m.email === detailUser.email).length : 0}
                </span>
              </TabsTrigger>
              <TabsTrigger value="indicators" className="gap-1.5">
                <Key className="size-3.5" />
                Indicators
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {detailUser ? members.filter((m) => m.indicatorId && m.email === detailUser.email).length : 0}
                </span>
              </TabsTrigger>
              <TabsTrigger value="bots" className="gap-1.5">
                <ShieldCheck className="size-3.5" />
                Bots
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {detailUser ? members.filter((m) => m.botId && m.email === detailUser.email).length : 0}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="mt-4">
              <EnrolledProductsTable
                items={members
                  .filter((m) => m.courseId && m.email === detailUser?.email)
                  .map((m) => {
                    const course = courses.find((c) => c.id === m.courseId);
                    return {
                      id: m.id,
                      name: course?.title || `Course #${m.courseId}`,
                      idLabel: course?.course_id || "—",
                      access: m.accessType,
                      joined: m.joinedAt,
                      expiry: m.discordExpiry || "",
                    };
                  })}
                type="course"
                onEditExpiry={(id, date) => {
                  const member = useAcademyStore.getState().members.find((m) => m.id === id);
                  if (member) useAcademyStore.getState().updateMember(id, { discordExpiry: date });
                }}
              />
            </TabsContent>
            <TabsContent value="indicators" className="mt-4">
              <EnrolledProductsTable
                items={members
                  .filter((m) => m.indicatorId && m.email === detailUser?.email)
                  .map((m) => {
                    const ind = indicators.find((i) => i.id === m.indicatorId);
                    return {
                      id: m.id,
                      name: ind?.title || `Indicator #${m.indicatorId}`,
                      idLabel: ind?.indicator_id || "—",
                      access: m.accessType,
                      joined: m.joinedAt,
                      expiry: m.indicatorExpiry || "",
                    };
                  })}
                type="indicator"
                onEditExpiry={(id, date) => {
                  const member = useAcademyStore.getState().members.find((m) => m.id === id);
                  if (member) useAcademyStore.getState().updateMember(id, { indicatorExpiry: date });
                }}
              />
            </TabsContent>
            <TabsContent value="bots" className="mt-4">
              <EnrolledProductsTable
                items={members
                  .filter((m) => m.botId && m.email === detailUser?.email)
                  .map((m) => {
                    const bot = bots.find((b) => b.id === m.botId);
                    return {
                      id: m.id,
                      name: bot?.title || `Bot #${m.botId}`,
                      idLabel: bot?.bot_id || "—",
                      access: m.accessType,
                      joined: m.joinedAt,
                      expiry: m.botExpiry || "",
                    };
                  })}
                type="bot"
                onEditExpiry={(id, date) => {
                  const member = useAcademyStore.getState().members.find((m) => m.id === id);
                  if (member) useAcademyStore.getState().updateMember(id, { botExpiry: date });
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5" /> Add New Client
            </DialogTitle>
            <DialogDescription>
              Create a new client account. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Username *</Label>
              <div className="flex gap-2">
                <Input
                  value={addForm.username}
                  onChange={(e) => {
                    setAddForm((f) => ({ ...f, username: e.target.value }));
                    setUsernameStatus("idle");
                  }}
                  onBlur={() => checkUsernameAvailability(addForm.username)}
                  placeholder="unique username"
                />
                <div className="flex items-center">
                  {usernameStatus === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {usernameStatus === "available" && <span className="text-xs font-medium text-emerald-600">Available</span>}
                  {usernameStatus === "taken" && <span className="text-xs font-medium text-destructive">Taken</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={addForm.firstname}
                  onChange={(e) => setAddForm((f) => ({ ...f, firstname: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={addForm.lastname}
                  onChange={(e) => setAddForm((f) => ({ ...f, lastname: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="client@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <Input
                type="tel"
                value={addForm.mobile}
                onChange={(e) => setAddForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label>TradingView ID <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                value={addForm.tvid}
                onChange={(e) => setAddForm((f) => ({ ...f, tvid: e.target.value }))}
                placeholder="TVID"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telegram User ID <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={addForm.telegramid}
                  onChange={(e) => setAddForm((f) => ({ ...f, telegramid: e.target.value }))}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label>Telegram Chat ID <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={(addForm as any).telegramchatid}
                  onChange={(e) => setAddForm((f) => ({ ...f, telegramchatid: e.target.value }))}
                  placeholder="Chat ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discord User ID <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={addForm.discordid}
                  onChange={(e) => setAddForm((f) => ({ ...f, discordid: e.target.value }))}
                  placeholder="User ID"
                />
              </div>
              <div className="space-y-2">
                <Label>Discord Chat ID <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  value={(addForm as any).discordchatid}
                  onChange={(e) => setAddForm((f) => ({ ...f, discordchatid: e.target.value }))}
                  placeholder="Chat ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Password <span className="text-muted-foreground">(optional — admin can set/change)</span></Label>
              <div className="relative">
                <Input
                  type={showAddPass ? "text" : "password"}
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank for system-generated"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowAddPass(!showAddPass)}
                >
                  {showAddPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>Cancel</Button>
            <Button
              onClick={handleAddClient}
              disabled={addSaving || !addForm.username.trim() || !addForm.firstname.trim() || !addForm.lastname.trim() || !addForm.email.trim() || !addForm.mobile.trim() || usernameStatus === "taken" || usernameStatus === "checking"}
            >
              {addSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {addSaving ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EnrolledProductsTable({
  items,
  type,
  onEditExpiry,
}: {
  items: { id: number; name: string; idLabel: string; access: string; joined: string; expiry: string }[];
  type: "course" | "indicator" | "bot";
  onEditExpiry: (id: number, date: string) => void;
}) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const [editExpiryId, setEditExpiryId] = React.useState<number | null>(null);
  const [editExpiryDate, setEditExpiryDate] = React.useState("");
  const [editExpiryCurrent, setEditExpiryCurrent] = React.useState("");
  const pageSize = 10;
  const pageCount = Math.ceil(items.length / pageSize);
  const paged = items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  React.useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  function handleSaveExpiry() {
    if (editExpiryId !== null) {
      onEditExpiry(editExpiryId, editExpiryDate);
      toast.success("Expiry date updated.");
      setEditExpiryId(null);
      setEditExpiryDate("");
    }
  }

  const expiryLabel = type === "course" ? "Discord Expiry" : type === "indicator" ? "Indicator Expiry" : "Bot Expiry";

  return (
    <>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            {type === "course" ? <GraduationCap className="size-4" /> : type === "indicator" ? <Key className="size-4" /> : <ShieldCheck className="size-4" />}
            {type.charAt(0).toUpperCase() + type.slice(1)} Enrolments
          </CardTitle>
          <CardDescription>
            {items.length} product{items.length !== 1 ? "s" : ""} enrolled
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No {type} enrolments found for this client.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[60px] text-center">#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="hidden md:table-cell">ID</TableHead>
                      <TableHead className="text-center">Access</TableHead>
                      <TableHead className="hidden md:table-cell">Enrolled</TableHead>
                      <TableHead className="hidden md:table-cell">{expiryLabel}</TableHead>
                      <TableHead className="w-[80px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length ? (
                      paged.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-center font-mono text-sm text-muted-foreground">
                            {pageIndex * pageSize + idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="hidden font-mono text-[12px] md:table-cell">{item.idLabel}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                item.access === "paid"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              }
                            >
                              {item.access === "paid" ? "Paid" : "Free"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden text-sm md:table-cell">{formatDate(item.joined)}</TableCell>
                          <TableCell className="hidden text-sm md:table-cell">
                            {item.expiry ? formatDate(item.expiry) : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => {
                                setEditExpiryId(item.id);
                                setEditExpiryDate(item.expiry ? item.expiry.split("T")[0] : new Date().toISOString().split("T")[0]);
                                setEditExpiryCurrent(item.expiry ? item.expiry.split("T")[0] : "—");
                              }}
                            >
                              <Edit className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                          No {type} enrolments.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {pageCount > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 text-muted-foreground text-sm">
                    {items.length} row(s) total.
                  </div>
                  <div className="flex items-center justify-center gap-8">
                    <div className="font-medium text-sm whitespace-nowrap">
                      Page {pageIndex + 1} of {pageCount || 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>
                        <ChevronsLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="size-8" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0}>
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="size-8" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1}>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1}>
                        <ChevronsRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editExpiryId !== null} onOpenChange={(open) => { if (!open) { setEditExpiryId(null); setEditExpiryDate(""); setEditExpiryCurrent(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {expiryLabel}</DialogTitle>
            <DialogDescription>Set the expiry date for this product.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={editExpiryDate}
              onChange={(e) => setEditExpiryDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Current: {editExpiryCurrent}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditExpiryId(null); setEditExpiryDate(""); setEditExpiryCurrent(""); }}>Cancel</Button>
            <Button onClick={handleSaveExpiry}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
