"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Topbar from "@/components/dashboard/Topbar";
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
  Skeleton,
} from "@/components/ui";
import {
  Search,
  RefreshCw,
  Trash2,
  ScrollText,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
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

const levelBadge: Record<string, "success" | "warning" | "error" | "outline"> =
  {
    info: "outline",
    warn: "warning",
    error: "error",
  };

function statusClass(code?: number) {
  if (!code) return "text-zinc-500";
  if (code >= 500) return "text-red-400";
  if (code >= 400) return "text-amber-400";
  if (code >= 300) return "text-sky-400";
  if (code >= 200) return "text-emerald-400";
  return "text-zinc-500";
}

const latestIdRef = useRef<string | null>(null);

const methodClass: Record<string, string> = {
  GET: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  POST: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PUT: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  PATCH: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  DELETE: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [live, setLive] = useState(true);
  const [clearing, setClearing] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(
    async (p = 1, q = search, lv = level) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: "50",
        search: q,
        level: lv,
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(data.data || []);
      if (p === 1 && (data.data || []).length > 0) {
        latestIdRef.current = data.data[0]._id;
      }
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setLoading(false);
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
    pollRef.current = setInterval(() => load(page, search, level), 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [live, page, search, level, load]);

  async function clearLogs() {
    if (!confirm("OK?")) return;
    setClearing(true);
    await fetch("/api/admin/logs", { method: "DELETE" });
    setClearing(false);
    load(1, search, level);
  }

  const pollNewLogs = useCallback(async () => {
    if (page !== 1) return;
    if (!latestIdRef.current) return load(1, search, level);

    const params = new URLSearchParams({
      afterId: latestIdRef.current,
      search,
      level,
    });
    try {
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      const newOnes: LogEntry[] = data.data || [];
      if (newOnes.length === 0) return;

      setLogs((prev) => [...newOnes].reverse().concat(prev).slice(0, 500));
      setTotal((t) => t + newOnes.length);
      latestIdRef.current = newOnes[newOnes.length - 1]._id;
    } catch {}
  }, [page, search, level]);

  function userLabel(meta?: LogEntry["meta"]) {
    if (!meta) return "—";
    if (meta.telegramUsername) return `@${meta.telegramUsername}`;
    if (meta.telegramId) return `tg:${meta.telegramId}`;
    if (meta.userId) return meta.userId.slice(-8);
    return "—";
  }

  return (
    <div>
      <Topbar title="Logs" subtitle={`${total.toLocaleString()} log entries`} />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              icon={<Search size={14} />}
              placeholder="Search message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
              load(1, search, e.target.value);
            }}
            className="w-36"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLive((l) => !l)}
          >
            {live ? <Pause size={14} /> : <Play size={14} />}
            {live ? "Pause" : "Live"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(page, search, level)}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearLogs}
            loading={clearing}
          >
            <Trash2 size={14} />
            Clear
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="pr-1 sm:pr-2">Path</TableHead>
                <TableHead className="pl-1 sm:pl-2">Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              jsx
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12 rounded-md" />
                    </TableCell>
                    <TableCell className="pr-1 sm:pr-2">
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="pl-1 sm:pl-2">
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full max-w-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-16 text-zinc-600"
                  >
                    <ScrollText size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No logs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const user = userLabel(log.meta);
                  return (
                    <TableRow key={log._id}>
                      <TableCell>
                        <span className="text-xs text-zinc-500 font-mono">
                          {timeAgo(log.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={levelBadge[log.level] || "outline"}>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.meta?.method ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                              methodClass[log.meta.method] ||
                              "text-zinc-400 bg-zinc-500/10 border-zinc-500/30"
                            }`}
                          >
                            {log.meta.method}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-1 sm:pr-2">
                        <span className="text-xs font-mono text-zinc-500">
                          {log.meta?.path || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="pl-1 sm:pl-2">
                        <span
                          className={`text-xs font-mono font-bold ${statusClass(log.meta?.statusCode)}`}
                        >
                          {log.meta?.statusCode ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            user === "—"
                              ? "text-xs font-mono text-zinc-600"
                              : "text-xs font-mono text-[#229ED9] font-semibold"
                          }
                        >
                          {user}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-300 break-all">
                          {log.message}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>{" "}
        </Card>
      </div>
    </div>
  );
}
