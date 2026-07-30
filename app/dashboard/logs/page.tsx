"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Topbar from "@/components/dashboard/Topbar";
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  Search,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Info,
  ScrollText,
} from "lucide-react";
import HealthPanel from "@/components/dashboard/HealthPanel";

interface LogEntry {
  _id: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: {
    telegramId?: string | null;
    telegramUsername?: string | null;
    userId?: string | null;
    method?: string;
    path?: string;
    statusCode?: number;
    durationMs?: number;
    stack?: string;
    [key: string]: any;
  };
  createdAt: string;
}

function userLabel(meta?: LogEntry["meta"]) {
  if (!meta) return "—";
  if (meta.telegramUsername) return `@${meta.telegramUsername}`;
  if (meta.telegramId) return `tg:${meta.telegramId}`;
  if (meta.userId) return meta.userId.slice(-8);
  return "—";
}

function userIdentifier(
  meta?: LogEntry["meta"],
): { id: string; label: string } | null {
  if (!meta) return null;
  if (meta.telegramUsername)
    return { id: meta.telegramUsername, label: `@${meta.telegramUsername}` };
  if (meta.telegramId)
    return { id: meta.telegramId, label: `tg:${meta.telegramId}` };
  if (meta.userId) return { id: meta.userId, label: meta.userId.slice(-8) };
  return null;
}

function levelColor(level: LogEntry["level"]) {
  if (level === "error") return "text-red-400";
  if (level === "warn") return "text-yellow-400";
  return "text-sky-400";
}

function statusColor(code?: number) {
  if (!code) return "text-zinc-500";
  if (code >= 500) return "text-red-400";
  if (code >= 400) return "text-orange-400";
  if (code >= 300) return "text-sky-400";
  if (code >= 200) return "text-emerald-400";
  return "text-zinc-500";
}

function methodColor(method?: string) {
  switch (method) {
    case "GET":
      return "text-sky-400";
    case "POST":
      return "text-emerald-400";
    case "PUT":
      return "text-amber-400";
    case "PATCH":
      return "text-purple-400";
    case "DELETE":
      return "text-red-400";
    default:
      return "text-zinc-400";
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [live, setLive] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const latestIdRef = useRef<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(
    async (
      p = 1,
      q = search,
      lv = level,
      uid = userFilter?.id ?? "",
      showLoading = true,
    ) => {
      if (showLoading) setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: "80",
        search: q,
        level: lv,
        ...(uid ? { userId: uid } : {}),
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(data.data || []);
      if (p === 1 && (data.data || []).length)
        latestIdRef.current = data.data[0]._id;
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (showLoading) setLoading(false);
    },
    [search, level, userFilter],
  );

  useEffect(() => {
    load(1, "", "");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(1, search, level);
    }, 400);
    return () => clearTimeout(t);
  }, [search, level]);

  useEffect(() => {
    if (!live) return;
    pollRef.current = setInterval(async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "80",
        search,
        level,
        ...(userFilter?.id ? { userId: userFilter.id } : {}),
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      const newLogs = data.data || [];
      if (!newLogs.length) return;
      if (newLogs[0]._id === latestIdRef.current) return;
      latestIdRef.current = newLogs[0]._id;
      setLogs((prev) => {
        const oldIds = new Set(prev.map((x) => x._id));
        const incoming = newLogs.filter((x: LogEntry) => !oldIds.has(x._id));
        if (incoming.length) {
          setNewIds(incoming.map((x: LogEntry) => x._id));
          setTimeout(() => setNewIds([]), 500);
        }
        return [...incoming, ...prev].slice(0, 80);
      });
      setTotal(data.total || 0);
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [live, search, level, userFilter]);

  async function clearLogs() {
    if (!confirm("Delete all logs?")) return;
    setClearing(true);
    await fetch("/api/admin/logs", { method: "DELETE" });
    setClearing(false);
    load(1, search, level);
  }

  return (
    <div>
      <Topbar
        title="Logs"
        subtitle={`${total.toLocaleString()} backend events`}
      />

      <div className="p-6 space-y-4">
        <HealthPanel />
        <Card className="border-zinc-800 bg-zinc-900/60">
          <div className="p-4 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[240px]">
              <Input
                icon={<Search size={15} />}
                placeholder="Search message, user, path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              className="w-36"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
                load(1, search, e.target.value);
              }}
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLive((l) => !l)}
            >
              {live ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => load(page, search, level)}
            >
              <RefreshCw size={14} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={clearing}
              onClick={clearLogs}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </Card>

        {userFilter && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-950/30 border border-sky-900/50 text-xs text-sky-300 w-fit">
            <span>Filtering by</span>
            <span className="font-mono font-semibold">{userFilter.label}</span>
            <button
              onClick={() => {
                setUserFilter(null);
                setPage(1);
                load(1, search, level, "");
              }}
              className="ml-1 text-sky-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        <Card className="border-zinc-800 bg-black overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-900 bg-zinc-950">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-[11px] text-zinc-600 font-mono">
              server — logs
            </span>
            {live && (
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="font-mono text-[12.5px] leading-6 overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full bg-zinc-900" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 text-center text-zinc-600">
                <ScrollText size={32} className="mx-auto opacity-20 mb-3" />
                No logs found.
              </div>
            ) : (
              <div className="divide-y divide-zinc-900/80">
                {logs.map((log) => {
                  const isNew = newIds.includes(log._id);
                  return (
                    <div
                      key={log._id}
                      className={`flex items-center gap-3 px-4 py-1.5 hover:bg-zinc-900/50 transition-colors whitespace-nowrap ${
                        isNew ? "new-log" : ""
                      }`}
                    >
                      <span className="text-zinc-600 shrink-0 w-[68px]">
                        {new Date(log.createdAt).toLocaleTimeString("en-GB")}
                      </span>
                      {(() => {
                        const uid = userIdentifier(log.meta);
                        return uid ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserFilter(uid);
                              setPage(1);
                              load(1, search, level, uid.id);
                            }}
                            title={`Show all logs for ${uid.label}`}
                            className={`shrink-0 w-[150px] truncate text-left hover:underline ${levelColor(log.level)}`}
                          >
                            {uid.label}
                          </button>
                        ) : (
                          <span
                            className={`shrink-0 w-[150px] truncate ${levelColor(log.level)}`}
                          >
                            —
                          </span>
                        );
                      })()}
                      <span
                        className={`shrink-0 w-[52px] font-bold ${methodColor(log.meta?.method)}`}
                      >
                        {log.meta?.method ?? "—"}
                      </span>
                      <span
                        className={`shrink-0 w-[70px] font-bold ${statusColor(log.meta?.statusCode)}`}
                      >
                        {log.meta?.statusCode ?? "—"}
                      </span>
                      <span className="text-zinc-300 truncate flex-1 min-w-0">
                        {log.meta?.path || log.message}
                      </span>
                      <button
                        onClick={() => setSelected(log)}
                        className="shrink-0 p-1 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="Details"
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-zinc-500">
              Page <span className="text-zinc-200 font-semibold">{page}</span>{" "}
              of{" "}
              <span className="text-zinc-200 font-semibold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  load(p, search, level);
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  load(p, search, level);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge
                variant={
                  selected?.level === "error"
                    ? "error"
                    : selected?.level === "warn"
                      ? "warning"
                      : "outline"
                }
              >
                {selected?.level?.toUpperCase()}
              </Badge>
              Log Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="overflow-y-auto -mx-6 px-6 flex-1 space-y-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Message</p>
                <p className="text-sm text-zinc-100 break-words">
                  {selected.message}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 cursor-pointer hover:border-sky-800 transition-colors"
                  onClick={() => {
                    const uid = userIdentifier(selected.meta);
                    if (!uid) return;
                    setUserFilter(uid);
                    setPage(1);
                    setSelected(null);
                    load(1, search, level, uid.id);
                  }}
                >
                  <p className="text-xs text-zinc-500 mb-1">User</p>
                  <p className="font-mono text-sm text-sky-400">
                    {userLabel(selected.meta)}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 mb-1">Time</p>
                  <p className="font-mono text-sm">
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 mb-1">Endpoint</p>
                  <p className="font-mono text-sm break-all">
                    {selected.meta?.method} {selected.meta?.path || "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 mb-1">
                    Status / Duration
                  </p>
                  <p className="font-mono text-sm">
                    {selected.meta?.statusCode ?? "—"} ·{" "}
                    {selected.meta?.durationMs ?? "—"}ms
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Full Metadata</p>
                <pre className="rounded-xl bg-black/40 border border-zinc-800 p-4 overflow-auto text-xs leading-6 font-mono text-zinc-300">
                  {JSON.stringify(selected.meta ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
