"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button } from "@/components/ui";
import {
  Activity,
  Database,
  Bot,
  Cpu,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
} from "lucide-react";

interface HealthData {
  success: boolean;
  uptime: { seconds: number; human: string };
  services: {
    database: {
      connected: boolean;
      status: string;
      name: string | null;
      host: string | null;
    };
    telegram: { userClientConnected: boolean; botPolling: boolean };
  };
  system: {
    nodeVersion: string;
    env: string;
    pid: number;
    memoryMb: { rss: number; heapUsed: number; heapTotal: number };
  };
}

export default function HealthPanel() {
  const [data, setData] = useState<HealthData | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      const json = await res.json();
      setLatencyMs(Math.round(performance.now() - start));
      setOk(json.ok === true && json.data?.success === true);
      setData(json.data ?? null);
      setError(json.ok ? null : json.error || `HTTP ${json.status}`);
    } catch (e: any) {
      setLatencyMs(Math.round(performance.now() - start));
      setOk(false);
      setError(e.message || "Request failed");
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, check]);

  const dbOk = data?.services?.database?.connected;
  const tgUserOk = data?.services?.telegram?.userClientConnected;
  const tgBotOk = data?.services?.telegram?.botPolling;

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <div className="p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Activity
            size={16}
            className={ok ? "text-emerald-400" : "text-red-400"}
          />
          <span className="text-sm font-semibold text-white">
            Backend Health
          </span>
          {ok === null ? null : ok ? (
            <Badge variant="success">
              <CheckCircle2 size={10} /> Healthy
            </Badge>
          ) : (
            <Badge variant="error">
              <XCircle size={10} /> Degraded
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
              <Clock size={11} />
              {lastChecked.toLocaleTimeString()}
              {latencyMs !== null && ` · ${latencyMs}ms`}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? "Auto: On" : "Auto: Off"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={check}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {error && !data && (
        <div className="px-4 pb-4 text-xs text-red-400">{error}</div>
      )}

      {data && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Database
                size={13}
                className={dbOk ? "text-emerald-400" : "text-red-400"}
              />
              <span className="text-xs text-zinc-400">MongoDB</span>
            </div>
            <p className="text-sm text-white font-mono">
              {data.services.database.status}
            </p>
            <p className="text-[10px] text-zinc-600 font-mono mt-1 truncate">
              {data.services.database.host || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot
                size={13}
                className={
                  tgUserOk && tgBotOk ? "text-emerald-400" : "text-amber-400"
                }
              />
              <span className="text-xs text-zinc-400">Telegram</span>
            </div>
            <p className="text-[11px] text-zinc-300">
              User client: {tgUserOk ? "connected" : "disconnected"}
            </p>
            <p className="text-[11px] text-zinc-300">
              Bot polling: {tgBotOk ? "active" : "inactive"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Server size={13} className="text-sky-400" />
              <span className="text-xs text-zinc-400">Process</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-mono">
              uptime: {data.uptime.human}
            </p>
            <p className="text-[11px] text-zinc-300 font-mono">
              node {data.system.nodeVersion} · {data.system.env}
            </p>
            <p className="text-[11px] text-zinc-300 font-mono flex items-center gap-1">
              <Cpu size={10} /> RSS {data.system.memoryMb.rss}MB · heap{" "}
              {data.system.memoryMb.heapUsed}/{data.system.memoryMb.heapTotal}MB
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
