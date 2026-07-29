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
    if (!confirm("همه لاگ‌ها پاک شوند؟")) return;
    setClearing(true);
    await fetch("/api/admin/logs", { method: "DELETE" });
    setClearing(false);
    load(1, search, level);
  }

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
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-16 text-zinc-600"
                  >
                    <ScrollText size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No logs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
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
                      <span className="text-xs text-zinc-300 break-all">
                        {log.message}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-zinc-400">
                        {userLabel(log.meta)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-zinc-500">
                        {log.meta?.method ? `${log.meta.method} ` : ""}
                        {log.meta?.path || "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 font-mono">
              {total} logs total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => {
                  const np = page - 1;
                  setPage(np);
                  load(np, search, level);
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
                  const np = page + 1;
                  setPage(np);
                  load(np, search, level);
                }}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
