"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import { Card, CardHeader, CardTitle, CardContent, Skeleton, Badge } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Radio, Music2, Users, Download, BarChart3 } from "lucide-react";

const COLORS = ["#ef4444", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"];

const tooltipStyle = {
  contentStyle: { background: "#18181b", border: "1px solid #27272a", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#fff" },
  itemStyle: { color: "#a1a1aa" },
  cursor: { fill: "rgba(255,255,255,0.02)" },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  const pieData = data ? [
    { name: "Active Users", value: data.users?.active ?? 0 },
    { name: "Inactive", value: (data.users?.total ?? 0) - (data.users?.active ?? 0) },
  ] : [];

  const channelStatusData = data ? [
    { name: "Active", value: data.channels?.active ?? 0, color: "#10b981" },
    { name: "Others", value: (data.channels?.total ?? 0) - (data.channels?.active ?? 0), color: "#3f3f46" },
  ] : [];

  return (
    <div>
      <Topbar title="Analytics" subtitle="Platform insights and statistics" />

      <div className="p-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {([
            { label: "Download Rate", value: data ? (data.downloads?.total > 0 ? Math.round((data.downloads?.completed / data.downloads?.total) * 100) + "%" : "0%") : "—", sub: "completion rate", icon: <Download size={18} />, color: "text-red-400 bg-red-500/10" },
            { label: "Avg Songs/Channel", value: data ? (data.channels?.total > 0 ? Math.round(data.songs?.total / data.channels?.total) : 0) : "—", sub: "per channel", icon: <Music2 size={18} />, color: "text-emerald-400 bg-emerald-500/10" },
            { label: "Channels/User", value: data ? (data.users?.total > 0 ? (data.channels?.total / data.users?.total).toFixed(1) : "0") : "—", sub: "average", icon: <Radio size={18} />, color: "text-purple-400 bg-purple-500/10" },
            { label: "Active Rate", value: data ? (data.users?.total > 0 ? Math.round((data.users?.active / data.users?.total) * 100) + "%" : "0%") : "—", sub: "of users active", icon: <Users size={18} />, color: "text-blue-400 bg-blue-500/10" },
          ] as const).map((kpi, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{kpi.label}</p>
                <div className={`p-2 rounded-xl ${kpi.color}`}>{kpi.icon}</div>
              </div>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <p className="text-3xl font-bold text-white font-mono">{kpi.value}</p>
              )}
              <p className="text-xs text-zinc-600 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Downloads trend */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Download Activity (Last 7 days)</CardTitle>
                <TrendingUp size={16} className="text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data?.downloadTrend ?? []} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="_id" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: "#ef4444", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} name="Downloads" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* User Status Pie */}
          <Card>
            <CardHeader>
              <CardTitle>User Status</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56" /> : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "#ef4444" : "#27272a"} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs text-zinc-400">Active ({data?.users?.active})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zinc-700" />
                      <span className="text-xs text-zinc-400">Inactive ({(data?.users?.total ?? 0) - (data?.users?.active ?? 0)})</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Top channels bar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Songs per Channel (Top 10)</CardTitle>
                <BarChart3 size={16} className="text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={data?.channelStats ?? []}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="channelName"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                      tickFormatter={v => v.length > 12 ? v.slice(0, 12) + "…" : v}
                    />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="songsCount" fill="#ef4444" radius={[0, 6, 6, 0]} name="Songs" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary stats */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Total Users", value: data?.users?.total?.toLocaleString(), badge: "default" as const },
                    { label: "Active Users", value: data?.users?.active?.toLocaleString(), badge: "success" as const },
                    { label: "Total Channels", value: data?.channels?.total?.toLocaleString(), badge: "purple" as const },
                    { label: "Active Channels", value: data?.channels?.active?.toLocaleString(), badge: "success" as const },
                    { label: "Total Songs", value: data?.songs?.total?.toLocaleString(), badge: "default" as const },
                    { label: "Total Downloads", value: data?.downloads?.total?.toLocaleString(), badge: "default" as const },
                    { label: "Completed Downloads", value: data?.downloads?.completed?.toLocaleString(), badge: "success" as const },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <span className="text-sm text-zinc-400">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-white">{row.value ?? "—"}</span>
                        <Badge variant={row.badge} className="text-[10px] px-1.5 py-0">{row.badge === "success" ? "✓" : "•"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
