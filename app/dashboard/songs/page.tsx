"use client";

import { useEffect, useState, useCallback } from "react";
import Topbar from "@/components/dashboard/Topbar";
import {
  Button, Badge, Card, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Skeleton,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui";
import {
  Search, MoreHorizontal, Trash2, RefreshCw,
  Music2, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle, Clock,
} from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";

interface Song {
  _id: string;
  title: string;
  artist: string;
  duration: number;
  fileSize: number;
  channelUsername: string;
  channelDbId: string;
  messageId: number;
  mimeType: string;
  messageDate: string;
  fileId: string;
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Song | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20", search: q });
    const res = await fetch(`/api/admin/songs?${params}`);
    const data = await res.json();
    setSongs(data.data || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(1, ""); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1, search); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function deleteSong() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/songs?id=${deleteConfirm._id}`, { method: "DELETE" });
    setDeleteLoading(false);
    setDeleteConfirm(null);
    load(page, search);
  }

  function formatFileSize(bytes: number) {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <Topbar title="Songs" subtitle={`${total.toLocaleString()} songs across all channels`} />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              icon={<Search size={14} />}
              placeholder="Search title or artist…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => load(page, search)}>
            <RefreshCw size={14} />Refresh
          </Button>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Song</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : songs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-zinc-600">
                    <Music2 size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No songs found</p>
                  </TableCell>
                </TableRow>
              ) : songs.map(song => (
                <TableRow key={song._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-900/60 to-red-950 flex items-center justify-center shrink-0">
                        <Music2 size={14} className="text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate max-w-[200px]" title={song.title}>
                          {song.title}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono">id:{song._id.slice(-8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-400 truncate max-w-[120px] block" title={song.artist}>
                      {song.artist === "Unknown" ? <span className="text-zinc-600">Unknown</span> : song.artist}
                    </span>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://t.me/${song.channelUsername}/${song.messageId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-blue-400 transition-colors"
                    >
                      @{song.channelUsername}
                      <ExternalLink size={9} />
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                      <Clock size={11} className="text-zinc-600" />
                      {song.duration ? formatDuration(song.duration) : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-zinc-500">{formatFileSize(song.fileSize)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-zinc-500 font-mono">
                      {song.messageDate ? formatDate(song.messageDate) : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(`https://t.me/${song.channelUsername}/${song.messageId}`, "_blank")}>
                          <ExternalLink size={14} />View on Telegram
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => setDeleteConfirm(song)}>
                          <Trash2 size={14} />Delete Song
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 font-mono">{total.toLocaleString()} songs total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={page <= 1}
                onClick={() => { const np = page - 1; setPage(np); load(np, search); }}>
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs font-mono text-zinc-400 px-2">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages}
                onClick={() => { const np = page + 1; setPage(np); load(np, search); }}>
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
            <DialogTitle>Delete Song</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-red-900/40 flex items-center justify-center">
                <Music2 size={16} className="text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{deleteConfirm?.title}</p>
                <p className="text-xs text-zinc-500">{deleteConfirm?.artist}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 font-mono flex gap-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              This removes the song from the database only. Cache files are unaffected.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={deleteSong} loading={deleteLoading}>
                <Trash2 size={14} />Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
