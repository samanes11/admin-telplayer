"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Topbar from "@/components/dashboard/Topbar";
import {
  Button, Card, Input,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Skeleton,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Badge,
} from "@/components/ui";
import {
  Plus, Trash2, RefreshCw, Radio, ExternalLink,
  Users, MoreHorizontal, AlertTriangle, CheckCircle2, Sparkles,
  Forward, X, Square, ChevronDown, ChevronUp, Play, Clock,
  Loader2, CheckCircle, XCircle, Ban,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DefaultChannel {
  _id: string;
  channelUsername: string;
  channelName: string;
  addedAt: string;
}

interface ForwarderJob {
  id: string;
  status: "running" | "done" | "error" | "cancelled";
  targetChannel: string;
  sourceChannels: string[];
  totalFound: number;
  totalSent: number;
  totalFailed: number;
  currentChannel: string;
  currentFile: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  logs?: string[];
}

// ─────────────────────────────────────────────────────────────
// Tab type
// ─────────────────────────────────────────────────────────────

type Tab = "channels" | "forwarder";

// ─────────────────────────────────────────────────────────────
// Forwarder Panel
// ─────────────────────────────────────────────────────────────

function ForwarderPanel() {
  const [targetChannel, setTargetChannel] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [sourceChannels, setSourceChannels] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<ForwarderJob | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const logsRef = useRef<HTMLDivElement>(null);

  const [jobs, setJobs] = useState<ForwarderJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [viewJob, setViewJob] = useState<ForwarderJob | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // load job history
  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/forwarder/jobs");
      const d = await res.json();
      setJobs(d.data || []);
    } catch {}
    setLoadingJobs(false);
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // poll active job
  useEffect(() => {
    if (!activeJobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/forwarder/status/${activeJobId}`);
        const d = await res.json();
        if (d.success) {
          setActiveJob(d.data);
          if (d.data.status !== "running") {
            // finished — refresh history
            loadJobs();
            pollRef.current && clearInterval(pollRef.current);
          }
        }
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { pollRef.current && clearInterval(pollRef.current); };
  }, [activeJobId, loadJobs]);

  // auto-scroll logs
  useEffect(() => {
    if (logsRef.current && showLogs) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [activeJob?.logs, showLogs]);

  function addSourceChannel() {
    const ch = sourceInput.trim().replace("@", "");
    if (!ch) return;
    if (!sourceChannels.includes(ch)) setSourceChannels((p) => [...p, ch]);
    setSourceInput("");
  }

  async function startJob() {
    if (!targetChannel.trim() || sourceChannels.length === 0) return;
    setStarting(true);
    setStartError("");
    setActiveJob(null);

    try {
      const res = await fetch("/api/admin/forwarder/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetChannel: targetChannel.trim(),
          sourceChannels,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.msg || "Failed to start");
      setActiveJobId(d.jobId);
      setShowLogs(true);
    } catch (e: any) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  }

  async function cancelJob() {
    if (!activeJobId) return;
    try {
      await fetch(`/api/admin/forwarder/cancel/${activeJobId}`, { method: "POST" });
    } catch {}
  }

  async function loadJobDetail(id: string) {
    try {
      const res = await fetch(`/api/admin/forwarder/status/${id}`);
      const d = await res.json();
      if (d.success) setViewJob(d.data);
    } catch {}
  }

  const isRunning = activeJob?.status === "running";

  const statusIcon = (s: ForwarderJob["status"]) => {
    if (s === "running") return <Loader2 size={13} className="animate-spin text-blue-400" />;
    if (s === "done") return <CheckCircle size={13} className="text-emerald-400" />;
    if (s === "error") return <XCircle size={13} className="text-red-400" />;
    if (s === "cancelled") return <Ban size={13} className="text-zinc-500" />;
  };

  const statusBadge = (s: ForwarderJob["status"]) => {
    if (s === "running") return <Badge variant="warning">Running</Badge>;
    if (s === "done") return <Badge variant="success">Done</Badge>;
    if (s === "error") return <Badge variant="error">Error</Badge>;
    if (s === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  };

  return (
    <div className="space-y-5">

      {/* ── Config card ── */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Forward size={16} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Music Forwarder</h2>
              <p className="text-xs text-zinc-500">Forward audio files from source channels to your target channel</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Target */}
            <div>
              <label className="block text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                Target Channel
              </label>
              <Input
                placeholder="@mychannel or -100123456789"
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value)}
                disabled={isRunning}
              />
              <p className="text-[10px] text-zinc-600 mt-1">Music will be forwarded here</p>
            </div>

            {/* Source add */}
            <div>
              <label className="block text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                Add Source Channel
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="@sourcechannel"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSourceChannel()}
                  disabled={isRunning}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSourceChannel}
                  disabled={isRunning || !sourceInput.trim()}
                >
                  <Plus size={14} />
                </Button>
              </div>
              <p className="text-[10px] text-zinc-600 mt-1">Press Enter or + to add</p>
            </div>
          </div>

          {/* Source list */}
          {sourceChannels.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider">
                Source Channels ({sourceChannels.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {sourceChannels.map((ch) => (
                  <div
                    key={ch}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
                  >
                    <Radio size={11} className="text-purple-400" />
                    @{ch}
                    {!isRunning && (
                      <button
                        onClick={() => setSourceChannels((p) => p.filter((c) => c !== ch))}
                        className="ml-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {startError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5 mb-3">
              <AlertTriangle size={12} />
              {startError}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={startJob}
              loading={starting}
              disabled={isRunning || !targetChannel.trim() || sourceChannels.length === 0}
            >
              <Play size={14} />
              Start Forwarding
            </Button>
            {isRunning && (
              <Button variant="destructive" onClick={cancelJob}>
                <Square size={13} />
                Stop
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Active job monitor ── */}
      {activeJob && (
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {statusIcon(activeJob.status)}
                <span className="text-sm font-semibold text-white">
                  {activeJob.status === "running" ? "Forwarding in progress…" :
                   activeJob.status === "done" ? "Forwarding complete" :
                   activeJob.status === "cancelled" ? "Forwarding cancelled" :
                   "Forwarding failed"}
                </span>
              </div>
              <button
                onClick={() => setShowLogs((p) => !p)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Found", value: activeJob.totalFound, color: "text-zinc-300" },
                { label: "Sent", value: activeJob.totalSent, color: "text-emerald-400" },
                { label: "Failed", value: activeJob.totalFailed, color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                  <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Current activity */}
            {activeJob.status === "running" && (activeJob.currentChannel || activeJob.currentFile) && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-950/30 border border-blue-900/40 mb-4">
                <Loader2 size={12} className="animate-spin text-blue-400 shrink-0" />
                <div className="min-w-0">
                  {activeJob.currentChannel && (
                    <p className="text-xs text-blue-300 font-mono truncate">@{activeJob.currentChannel}</p>
                  )}
                  {activeJob.currentFile && (
                    <p className="text-[11px] text-zinc-500 truncate">{activeJob.currentFile}</p>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {activeJob.error && (
              <div className="px-3 py-2 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-400 mb-4">
                {activeJob.error}
              </div>
            )}

            {/* Logs */}
            {showLogs && activeJob.logs && activeJob.logs.length > 0 && (
              <div
                ref={logsRef}
                className="bg-zinc-950 rounded-xl border border-zinc-800 p-3 h-52 overflow-y-auto font-mono text-[11px] text-zinc-400 space-y-0.5"
              >
                {activeJob.logs.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.includes("✅") ? "text-emerald-400" :
                      line.includes("❌") ? "text-red-400" :
                      line.includes("⏳") ? "text-amber-400" :
                      line.includes("⚠️") ? "text-amber-300" :
                      line.includes("🎉") ? "text-emerald-300" :
                      line.includes("🛑") ? "text-red-300" :
                      "text-zinc-400"
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Job history ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Recent Jobs</p>
          <Button variant="ghost" size="sm" onClick={loadJobs}>
            <RefreshCw size={13} />
          </Button>
        </div>

        {loadingJobs ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10 text-zinc-600">
            <Forward size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No jobs yet</p>
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Sources</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <span className="text-xs font-mono text-zinc-300">@{job.targetChannel.replace("@", "")}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-zinc-500">{job.sourceChannels.length} channel{job.sourceChannels.length !== 1 ? "s" : ""}</span>
                    </TableCell>
                    <TableCell>
                      {statusBadge(job.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-emerald-400">{job.totalSent}</span>
                      {job.totalFailed > 0 && (
                        <span className="text-xs font-mono text-red-400 ml-1">/ {job.totalFailed} failed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-zinc-500 font-mono">{timeAgo(job.startedAt)}</span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => loadJobDetail(job.id)}>
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* ── Job logs modal ── */}
      <Dialog open={!!viewJob} onOpenChange={(o) => !o && setViewJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewJob && statusIcon(viewJob.status)}
              Job Logs — @{viewJob?.targetChannel?.replace("@", "")}
            </DialogTitle>
          </DialogHeader>
          {viewJob && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Found", value: viewJob.totalFound, color: "text-zinc-300" },
                  { label: "Sent", value: viewJob.totalSent, color: "text-emerald-400" },
                  { label: "Failed", value: viewJob.totalFailed, color: "text-red-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                    <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {viewJob.error && (
                <div className="px-3 py-2 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-400">
                  {viewJob.error}
                </div>
              )}
              {viewJob.logs && viewJob.logs.length > 0 && (
                <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-3 h-72 overflow-y-auto font-mono text-[11px] space-y-0.5">
                  {viewJob.logs.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.includes("✅") ? "text-emerald-400" :
                        line.includes("❌") ? "text-red-400" :
                        line.includes("⏳") ? "text-amber-400" :
                        line.includes("⚠️") ? "text-amber-300" :
                        line.includes("🎉") ? "text-emerald-300" :
                        line.includes("🛑") ? "text-red-300" :
                        "text-zinc-400"
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Default Channels Panel (same as before)
// ─────────────────────────────────────────────────────────────

function DefaultChannelsPanel() {
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

  useEffect(() => { load(); }, [load]);

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
      setApplyResult(`Applied to ${data.usersProcessed} users — ${data.added} new channel link(s) added.`);
    } catch (e: any) {
      setApplyResult(`Error: ${e.message}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Add channel form */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-white">Add a default channel</h2>
          </div>
          <form onSubmit={addChannel} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input placeholder="Channel username (e.g. channel_name)" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="flex-1">
              <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" loading={submitting} disabled={!username.trim() || !name.trim()}>
              <Plus size={14} />Add
            </Button>
          </form>
          {formError && (
            <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />{formError}
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            New default channels are auto-added for every newly registered user. Use "Apply to All Users" to also push them to existing accounts.
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
            <RefreshCw size={14} />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={applyToAll} loading={applying} disabled={channels.length === 0}>
            <Users size={14} />Apply to All Users
          </Button>
        </div>
      </div>

      {applyResult && (
        <div className="px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0" />{applyResult}
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
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : channels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-16 text-zinc-600">
                  <Radio size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No default channels yet</p>
                  <p className="text-xs text-zinc-700 mt-1">Add one above to auto-enroll every new user</p>
                </TableCell>
              </TableRow>
            ) : channels.map((ch) => (
              <TableRow key={ch._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-900/60 to-purple-950 flex items-center justify-center shrink-0">
                      <Radio size={14} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{ch.channelName}</p>
                      <a href={`https://t.me/${ch.channelUsername}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-zinc-500 font-mono hover:text-blue-400 transition-colors flex items-center gap-1">
                        @{ch.channelUsername}<ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-zinc-500 font-mono">{ch.addedAt ? timeAgo(ch.addedAt) : "—"}</span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.open(`https://t.me/${ch.channelUsername}`, "_blank")}>
                        <ExternalLink size={14} />Open in Telegram
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onClick={() => setDeleteConfirm(ch)}>
                        <Trash2 size={14} />Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Default Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Remove <span className="text-white font-medium">@{deleteConfirm?.channelUsername}</span> from the default channels list?
            </p>
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 text-xs text-amber-400 font-mono flex gap-2">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              This only stops it from being auto-added to new users — it won&apos;t remove it from accounts that already have it.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={deleteChannel} loading={deleteLoading}>
                <Trash2 size={14} />Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function DefaultChannelsPage() {
  const [tab, setTab] = useState<Tab>("channels");

  return (
    <div>
      <Topbar
        title="Default Channels"
        subtitle="Auto-enroll channels and forward music between channels"
      />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
          {([
            { id: "channels" as Tab, label: "Default Channels", icon: <Radio size={14} /> },
            { id: "forwarder" as Tab, label: "Music Forwarder", icon: <Forward size={14} /> },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                tab === t.id
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "channels" ? <DefaultChannelsPanel /> : <ForwarderPanel />}
      </div>
    </div>
  );
}
