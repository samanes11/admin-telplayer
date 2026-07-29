"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";

import Topbar from "@/components/dashboard/Topbar";

import { Card, Button, Badge, Input, Select, Skeleton } from "@/components/ui";

import {
  Search,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  ChevronDown,
  ChevronRight,
  ScrollText,
  Activity,
  AlertTriangle,
  CircleAlert,
  CheckCircle2,
  Clock3,
  User,
  Route,
  Globe,
  Server,
  Database,
  Braces,
} from "lucide-react";

import { timeAgo } from "@/lib/utils";

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

    [key: string]: any;
  };

  createdAt: string;
}

const methodColor: Record<string, string> = {
  GET: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  POST: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  PATCH: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/30",
};

const levelStyle = {
  info: {
    badge: "outline",
    icon: CheckCircle2,
    card: "border-l-4 border-l-sky-500 bg-sky-500/[0.03]",
  },

  warn: {
    badge: "warning",
    icon: AlertTriangle,
    card: "border-l-4 border-l-yellow-500 bg-yellow-500/[0.03]",
  },

  error: {
    badge: "error",
    icon: CircleAlert,
    card: "border-l-4 border-l-red-500 bg-red-500/[0.04]",
  },
};

function statusColor(code?: number) {
  if (!code) return "text-zinc-500";

  if (code >= 500) return "text-red-400";

  if (code >= 400) return "text-orange-400";

  if (code >= 300) return "text-sky-400";

  if (code >= 200) return "text-emerald-400";

  return "text-zinc-500";
}

function userLabel(meta?: LogEntry["meta"]) {
  if (!meta) return "—";

  if (meta.telegramUsername) return `@${meta.telegramUsername}`;

  if (meta.telegramId) return `tg:${meta.telegramId}`;

  if (meta.userId) return meta.userId.slice(-8);

  return "—";
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

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newIds, setNewIds] = useState<string[]>([]);

  const latestIdRef = useRef<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(
    async (p = 1, q = search, lv = level, showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: String(p),
        limit: "50",
        search: q,
        level: lv,
      });

      const res = await fetch(`/api/admin/logs?${params}`);

      const data = await res.json();

      setLogs(data.data || []);

      if (p === 1 && (data.data || []).length) {
        latestIdRef.current = data.data[0]._id;
      }

      setTotal(data.total || 0);

      setTotalPages(data.totalPages || 1);

      if (showLoading) {
        setLoading(false);
      }
    },
    [search, level],
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
        limit: "50",
        search,
        level,
      });

      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();

      const newLogs = data.data || [];

      if (!newLogs.length) return;

      if (newLogs[0]._id === latestIdRef.current) return;

      latestIdRef.current = newLogs[0]._id;

      setLogs((prev) => {
        const oldIds = new Set(prev.map((x) => x._id));

        const incoming = newLogs.filter((x) => !oldIds.has(x._id));

        if (incoming.length) {
          setNewIds(incoming.map((x) => x._id));

          setTimeout(() => {
            setNewIds([]);
          }, 500);
        }

        return [...incoming, ...prev].slice(0, 50);
      });

      setTotal(data.total || 0);
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [live, page, search, level, load]);

  async function clearLogs() {
    if (!confirm("Delete all logs?")) return;

    setClearing(true);

    await fetch("/api/admin/logs", {
      method: "DELETE",
    });

    setClearing(false);

    load(1, search, level);
  }

  const errors = logs.filter((x) => x.level === "error").length;

  const warnings = logs.filter((x) => x.level === "warn").length;

  const infos = logs.filter((x) => x.level === "info").length;

  return (
    <div>
      <Topbar
        title="Logs"
        subtitle={`${total.toLocaleString()} Backend Events`}
      />

      <div className="p-6 space-y-6">
        {/* ========================= */}
        {/* Stats */}
        {/* ========================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Total Logs
                </p>

                <h2 className="text-3xl font-bold mt-2">
                  {total.toLocaleString()}
                </h2>
              </div>

              <Activity className="text-sky-400" size={34} />
            </div>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Errors
                </p>

                <h2 className="text-3xl font-bold mt-2 text-red-400">
                  {errors}
                </h2>
              </div>

              <CircleAlert size={34} className="text-red-400" />
            </div>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Warnings
                </p>

                <h2 className="text-3xl font-bold mt-2 text-yellow-400">
                  {warnings}
                </h2>
              </div>

              <AlertTriangle size={34} className="text-yellow-400" />
            </div>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/60">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Live Monitor
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      live ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
                    }`}
                  />

                  <span
                    className={`font-semibold ${
                      live ? "text-emerald-400" : "text-zinc-400"
                    }`}
                  >
                    {live ? "ONLINE" : "PAUSED"}
                  </span>
                </div>
              </div>

              <Server size={34} className="text-emerald-400" />
            </div>
          </Card>
        </div>

        {/* ========================= */}
        {/* Toolbar */}
        {/* ========================= */}

        <Card className="border-zinc-800 bg-zinc-900/60">
          <div className="p-4 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[260px]">
              <Input
                icon={<Search size={15} />}
                placeholder="Search message, user, path..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select
              className="w-40"
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

            <Button variant="outline" onClick={() => setLive((l) => !l)}>
              {live ? <Pause size={15} /> : <Play size={15} />}
            </Button>

            <Button variant="outline" onClick={() => load(page, search, level)}>
              <RefreshCw size={15} />
            </Button>

            <Button
              variant="destructive"
              loading={clearing}
              onClick={clearLogs}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </Card>

        {/* ========================= */}
        {/* Log List */}
        {/* ========================= */}

        <div className="space-y-4">
          {loading ? (
            Array.from({
              length: 8,
            }).map((_, i) => (
              <Card key={i} className="border-zinc-800">
                <div className="p-5 space-y-4">
                  <Skeleton className="h-5 w-40" />

                  <Skeleton className="h-4 w-full" />

                  <Skeleton className="h-4 w-3/4" />
                </div>
              </Card>
            ))
          ) : logs.length === 0 ? (
            <Card className="border-zinc-800">
              <div className="py-24 text-center">
                <ScrollText size={48} className="mx-auto opacity-20 mb-4" />

                <p className="text-zinc-500">No logs found.</p>
              </div>
            </Card>
          ) : (
            logs.map((log) => {
              const style = levelStyle[log.level];

              const Icon = style.icon;

              const user = userLabel(log.meta);

              const open = expanded[log._id];

              const isNew = newIds.includes(log._id);

              return (
                <Card
                  key={log._id}
                  className={`
                    ${style.card}
                    ${isNew ? "new-log" : ""}
                   border-zinc-800
                   hover:border-zinc-700
                    hover:shadow-xl
                   transition-all
                   duration-20`}
                >
                  <div className="p-5">
                    {/* ========================= */}
                    {/* Header */}
                    {/* ========================= */}

                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center
                          ${
                            log.level === "error"
                              ? "bg-red-500/10 text-red-400"
                              : log.level === "warn"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-sky-500/10 text-sky-400"
                          }`}
                        >
                          <Icon size={20} />
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={style.badge as any}>
                              {log.level.toUpperCase()}
                            </Badge>

                            {log.meta?.method && (
                              <span
                                className={`px-2 py-1 rounded-lg border text-[11px] font-bold font-mono ${
                                  methodColor[log.meta.method] ??
                                  "bg-zinc-700/30 border-zinc-700"
                                }`}
                              >
                                {log.meta.method}
                              </span>
                            )}

                            {log.meta?.statusCode && (
                              <span
                                className={`font-mono font-bold text-sm ${statusColor(
                                  log.meta.statusCode,
                                )}`}
                              >
                                {log.meta.statusCode}
                              </span>
                            )}
                          </div>

                          <p className="text-[15px] leading-7 text-zinc-100 break-words">
                            {log.message}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [log._id]: !prev[log._id],
                          }))
                        }
                      >
                        {open ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                        Details
                      </Button>
                    </div>

                    {/* ========================= */}
                    {/* Info */}
                    {/* ========================= */}

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <Route size={14} />
                          Endpoint
                        </div>

                        <p className="font-mono text-[13px] mt-2 break-all text-zinc-200">
                          {log.meta?.path || "—"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <User size={14} />
                          User
                        </div>

                        <p className="font-mono text-[13px] mt-2 text-sky-400">
                          {user}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <Clock3 size={14} />
                          Time
                        </div>

                        <p className="font-mono text-[13px] mt-2">
                          {timeAgo(log.createdAt)}
                        </p>

                        <p className="text-[11px] mt-1 text-zinc-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <Database size={14} />
                          Log ID
                        </div>

                        <p className="font-mono text-[13px] mt-2 truncate">
                          {log._id}
                        </p>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-6 border-t border-zinc-800 pt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Braces size={15} className="text-zinc-500" />

                          <span className="text-sm font-medium">Metadata</span>
                        </div>

                        <pre className="rounded-xl bg-black/40 border border-zinc-800 p-4 overflow-auto text-xs leading-6 font-mono text-zinc-300">
                          {JSON.stringify(log.meta ?? {}, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* ========================= */}
        {/* Pagination */}
        {/* ========================= */}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-sm text-zinc-500">
              Showing page{" "}
              <span className="font-semibold text-zinc-200">{page}</span> of{" "}
              <span className="font-semibold text-zinc-200">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  load(p, search, level);
                }}
              >
                Previous
              </Button>

              <div className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-sm font-medium">
                {page}
              </div>

              <Button
                variant="outline"
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
    </div>
  );
}
