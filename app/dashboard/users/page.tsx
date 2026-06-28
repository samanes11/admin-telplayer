"use client";

import { useEffect, useState, useCallback } from "react";
import Topbar from "@/components/dashboard/Topbar";
import UserDetailModal from "@/components/dashboard/UserDetailModal";
import {
  Button,
  Badge,
  Card,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Avatar,
  Skeleton,
  Toggle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui";
import {
  Search,
  MoreHorizontal,
  UserX,
  Edit3,
  Shield,
  ShieldCheck,
  RefreshCw,
  Radio,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Gem,
} from "lucide-react";
import { timeAgo, formatDate } from "@/lib/utils";

interface User {
  _id: string;
  telegramUsername?: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  channelCount: number;
  downloadCount: number;
  subscriptionPlan?: string | null;
  subscriptionExpiresAt?: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    userName: "",
    role: "user",
    isActive: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── کاربر انتخاب‌شده برای نمایش چنل‌ها/آهنگ‌ها ──
  const [viewUser, setViewUser] = useState<User | null>(null);

  const load = useCallback(
    async (p = 1, q = search) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: "15",
        search: q,
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setLoading(false);
    },
    [search],
  );

  useEffect(() => {
    load(1, "");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1, search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  function openEdit(user: User) {
    setEditUser(user);
    setEditForm({
      name: user.name,
      userName: user.telegramUsername,
      role: user.role,
      isActive: user.isActive,
    });
  }

  async function saveEdit() {
    if (!editUser) return;
    setEditLoading(true);
    const body: any = { id: editUser._id, ...editForm };
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditLoading(false);
    setEditUser(null);
    load(page, search);
  }

  async function toggleActive(user: User) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user._id, isActive: !user.isActive }),
    });
    setUsers((u) =>
      u.map((x) => (x._id === user._id ? { ...x, isActive: !x.isActive } : x)),
    );
  }

  async function deleteUser() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/users?id=${deleteConfirm._id}`, {
      method: "DELETE",
    });
    setDeleteLoading(false);
    setDeleteConfirm(null);
    load(page, search);
  }

  return (
    <div>
      <Topbar
        title="Users"
        subtitle={`${total.toLocaleString()} total users`}
      />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              icon={<Search size={14} />}
              placeholder="Search by name or username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(page, search)}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : users.map((user) => (
                      <TableRow
                        key={user._id}
                        className="cursor-pointer"
                        onClick={() => setViewUser(user)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={user.name || user.telegramUsername} size="sm" />
                            <div>
                              <p className="font-medium text-white text-sm">
                                {user.name || "—"}
                              </p>
                              <p className="text-xs text-zinc-500 font-mono">
                                {user.telegramUsername ? `@${user.telegramUsername}` : "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "error" : "outline"
                            }
                          >
                            {user.role === "admin" ? (
                              <ShieldCheck size={10} />
                            ) : (
                              <Shield size={10} />
                            )}
                            {user.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={user.isActive}
                              onChange={() => toggleActive(user)}
                            />
                            <span
                              className={`text-xs font-mono ${user.isActive ? "text-emerald-400" : "text-zinc-600"}`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.subscriptionExpiresAt &&
                          new Date(user.subscriptionExpiresAt) > new Date() ? (
                            <div>
                              <Badge variant="success">
                                <Gem size={10} />
                                {user.subscriptionPlan?.toUpperCase() ||
                                  "PREMIUM"}
                              </Badge>
                              <p className="text-[10px] text-zinc-600 font-mono mt-1">
                                until {formatDate(user.subscriptionExpiresAt)}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline">Free</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-zinc-500 font-mono">
                            {user.createdAt ? formatDate(user.createdAt) : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-zinc-500 font-mono">
                            {user.lastLogin ? timeAgo(user.lastLogin) : "Never"}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Edit3 size={14} /> Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleActive(user)}
                              >
                                <UserX size={14} />{" "}
                                {user.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                destructive
                                onClick={() => setDeleteConfirm(user)}
                              >
                                <Trash2 size={14} /> Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 font-mono">
              {total} users total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  load(page - 1, search);
                }}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs font-mono text-zinc-400 px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  load(page + 1, search);
                }}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* User channels/songs modal */}
      <UserDetailModal user={viewUser} onClose={() => setViewUser(null)} />

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <Avatar name={editUser.name || editUser.telegramUsername} />
                <div>
                  <p className="text-sm font-medium text-white">
                    {editUser.name || "Unnamed"}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {editUser.telegramUsername}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                    Name
                  </label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                    userName
                  </label>
                  <Input
                    value={editForm.userName}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, uerName: e.target.value }))
                    }
                    placeholder="UserName"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                    Role
                  </label>
                  <Select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value }))
                    }
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                    Status
                  </label>
                  <div className="flex items-center gap-2 h-10">
                    <Toggle
                      checked={editForm.isActive}
                      onChange={(v) =>
                        setEditForm((f) => ({ ...f, isActive: v }))
                      }
                    />
                    <span
                      className={`text-sm ${editForm.isActive ? "text-emerald-400" : "text-zinc-500"}`}
                    >
                      {editForm.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveEdit}
                  loading={editLoading}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              This will permanently delete{" "}
              <span className="text-white font-medium">
                {deleteConfirm?.telegramUsername}
              </span>{" "}
              and all their channels, songs, downloads, and playlists.
            </p>
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 font-mono">
              ⚠ This action cannot be undone.
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={deleteUser}
                loading={deleteLoading}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
