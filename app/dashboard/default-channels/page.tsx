"use client";

import { useEffect, useState, useCallback } from "react";
import Topbar from "@/components/dashboard/Topbar";
import {
  Button, Card, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Skeleton,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui";
import {
  Plus, Trash2, RefreshCw, Radio, ExternalLink,
  Users, MoreHorizontal, AlertTriangle, CheckCircle2, Sparkles,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface DefaultChannel {
  _id: string;
  channelUsername: string;
  channelName: string;
  addedAt: string;
}

export default function DefaultChannelsPage() {
  const [channels, setChannels] = useState<DefaultChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<DefaultChannel | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/default-channels");
    const data = await res.json();
    setChannels(data.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/default-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUsername: username.trim(), channelName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add channel");
      setUsername("");
      setName("");
      await load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteChannel() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    await fetch(`/api/admin/default-channels?id=${deleteConfirm._id}`, { method: "DELETE" });
    setDeleteLoading(false);
    setDeleteConfirm(null);
    load();
  }

  async function applyToAll() {
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch("/api/admin/default-channels/apply-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply");
      setApplyResult(
        `Applied to ${data.usersProcessed} users — ${data.added} new channel link(s) added.`
      );
    } catch (e: any) {
      setApplyResult(`Error: ${e.message}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <Topbar
        title="Default Channels"
        subtitle="Channels automatically added for every new user"
      />

      <div className="p-6 space-y-6">
        {/* Add channel form */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-red-400" />
              <h2 className="text-sm font-semibold text-white">Add a default channel</h2>
            </div>
            <form onSubmit={addChannel} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Channel username (e.g. channel_name)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button type="submit" loading={submitting} disabled={!username.trim() || !name.trim()}>
                <Plus size={14} />
                Add
              </Button>
            </form>
            {formError && (
              <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                {formError}
              </p>
            )}
            <p className="mt-3 text-xs text-zinc-500">
              New default channels are auto-added (status{" "}
              <span className="font-mono text-zinc-400">pending</span>) for every newly
              registered user. Use “Apply to All Users” to also push them to existing accounts.
            </p>
          </div>
        </Card>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-zinc-500 font-mono">
            {channels.length} default channel{channels.length === 1 ? "" : "s"} configured
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={applyToAll}
              loading={applying}
              disabled={channels.length === 0}
            >
              <Users size={14} />
              Apply to All Users
            </Button>
          </div>
        </div>

        {applyResult && (
          <div className="px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0" />
            {applyResult}
          </div>
        )}

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Added</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : channels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-16 text-zinc-600">
                    <Radio size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No default channels yet</p>
                    <p className="text-xs text-zinc-700 mt-1">
                      Add one above to auto-enroll every new user
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                channels.map((ch) => (
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
                      <span className="text-xs text-zinc-500 font-mono">
                        {ch.addedAt ? timeAgo(ch.addedAt) : "—"}
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
                          <DropdownMenuItem
                            onClick={() => window.open(`https://t.me/${ch.channelUsername}`, "_blank")}
                          >
                            <ExternalLink size={14} />
                            Open in Telegram
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onClick={() => setDeleteConfirm(ch)}>
                            <Trash2 size={14} />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Default Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Remove{" "}
              <span className="text-white font-medium">@{deleteConfirm?.channelUsername}</span>{" "}
              from the default channels list?
            </p>
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 text-xs text-amber-400 font-mono flex gap-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              This only stops it from being auto-added to new users — it won&apos;t remove it from
              accounts that already have it.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={deleteChannel}
                loading={deleteLoading}
              >
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}