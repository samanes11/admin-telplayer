"use client";

import { useEffect, useState, useCallback } from "react";
import Topbar from "@/components/dashboard/Topbar";
import {
  Button, Badge, Card, Input, Select,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Skeleton, Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui";
import {
  Search, MoreHorizontal, Trash2, RefreshCw,
  Radio, Music2, User, ChevronLeft, ChevronRight,
  ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle,
} from "lucide-react";
import { timeAgo, formatDate } from "@/lib/utils";

interface Channel {
  _id: string;
  channelName: string;
  channelUsername: string;
  status: string;
  songsCount: number;
  songCount: number;
  addedAt: string;
  lastSync?: string;
  userId: string;
  ownerEmail?: string;
  ownerName?: string;
  photoUrl?: string;
}

const statusConfig: Record<string, { label: string; badge: "success" | "error" | "warning" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Active", badge: "success", icon: <CheckCircle size={10} /> },
  error: { label: "Error", badge: "error", icon: <XCircle size={10} /> },
  syncing: { label: "Syncing…", badge: "warning", icon: <RefreshCw size={10} className="animate-spin" /> },
  pending: { label: "Pending", badge: "outline", icon: <Clock size={10} /> },
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Channel | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async (p = 1, q = search, s = statusFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "15", search: q, status: s });
    const res = await fetch(`/api/admin/channels?${params}`);
    const data = await res.json();
    setChannels(data.data || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { load(1, "", ""); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1, search, statusFilter); }, 400);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  async function deleteChannel() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/channels?id=${deleteConfirm._id}`, { method: "DELETE" });
    setDeleteLoading(false);
    setDeleteConfirm(null);
    load(page, search, statusFilter);
  }

  return (
    <div>
      <Topbar title="Channels" subtitle={`${total.toLocaleString()} Telegram channels`} />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              icon={<Search size={14} />}
              placeholder="Search channels…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); load(1, search, e.target.value); }}
            className="w-36"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="syncing">Syncing</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </Select>
          <Button variant="outline" size="sm" onClick={() => load(page, search, statusFilter)}>
            <RefreshCw size={14} />Refresh
          </Button>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Songs</TableHead>
                <TableHead className="hidden lg:table-cell">Added</TableHead>
                <TableHead className="hidden md:table-cell">Last Sync</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : channels.map(ch => {
                const status = statusConfig[ch.status] || statusConfig.pending;
                return (
                  <TableRow key={ch._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-900/60 to-purple-950 flex items-center justify-center shrink-0">
                          <Radio size={14} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{ch.channelName}</p>
                          <a
                            href={`https://t.me/${ch.channelUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-500 font-mono hover:text-blue-400 transition-colors flex items-center gap-1"
                          >
                            @{ch.channelUsername}
                            <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar name={ch.ownerName || ch.ownerEmail || "?"} size="sm" />
                        <div>
                          <p className="text-xs text-zinc-300">{ch.ownerName || "—"}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{ch.ownerEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.badge}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-xs">
                        <Music2 size={12} className="text-red-400" />
                        {(ch.songCount ?? ch.songsCount ?? 0).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-zinc-500 font-mono">{ch.addedAt ? formatDate(ch.addedAt) : "—"}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-zinc-500 font-mono">{ch.lastSync ? timeAgo(ch.lastSync) : "Never"}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`https://t.me/${ch.channelUsername}`, "_blank")}>
                            <ExternalLink size={14} />Open in Telegram
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onClick={() => setDeleteConfirm(ch)}>
                            <Trash2 size={14} />Delete Channel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 font-mono">{total} channels total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => { const np = page - 1; setPage(np); load(np, search, statusFilter); }}>
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs font-mono text-zinc-400 px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => { const np = page + 1; setPage(np); load(np, search, statusFilter); }}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={o => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              This will permanently delete <span className="text-white font-medium">@{deleteConfirm?.channelUsername}</span> and all <span className="text-red-400 font-mono">{deleteConfirm?.songCount ?? deleteConfirm?.songsCount ?? 0}</span> songs.
            </p>
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 font-mono flex gap-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              All songs in this channel will be permanently removed.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={deleteChannel} loading={deleteLoading}>
                <Trash2 size={14} />Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
