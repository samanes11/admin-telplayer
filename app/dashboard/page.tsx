"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/dashboard/Topbar";
import {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Avatar,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  Users,
  Radio,
  Music2,
  Download,
  TrendingUp,
  Clock,
  Activity,
  Disc3,
  MessageSquare,
  Mail,
} from "lucide-react";
import { formatDate, timeAgo, formatDuration } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });

    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.data || []);
        setLoadingMessages(false);
      });
  }, []);

  return (
    <div>
      <Topbar
        title="Overview"
        subtitle="Welcome back — here's what's happening"
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stat Cards */}
        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={data?.users?.total ?? 0}
                sub={`${data?.users?.active ?? 0} active`}
                icon={<Users size={20} />}
                color="blue"
              />
              <StatCard
                title="Channels"
                value={data?.channels?.total ?? 0}
                sub={`${data?.channels?.active ?? 0} active`}
                icon={<Radio size={20} />}
                color="purple"
              />
              <StatCard
                title="Total Songs"
                value={data?.songs?.total ?? 0}
                sub="across all channels"
                icon={<Music2 size={20} />}
                color="green"
              />
              <StatCard
                title="Downloads"
                value={data?.downloads?.total ?? 0}
                sub={`${data?.downloads?.completed ?? 0} completed`}
                icon={<Download size={20} />}
                color="red"
              />

              {/* ── کارت پیام‌ها — کلیک‌پذیر ── */}
              <button
                onClick={() => setShowMessages(true)}
                className="text-left relative rounded-2xl border bg-gradient-to-br p-4 sm:p-5 transition-all duration-200 from-amber-500/10 to-transparent border-amber-500/20 hover:border-amber-500/40 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-mono font-medium text-zinc-500 uppercase tracking-widest truncate">
                      Messages
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold text-white font-mono">
                      {messages.length.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 truncate">
                      {loadingMessages ? "loading…" : "tap to view all"}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl shrink-0 bg-amber-500/10 text-amber-400">
                    <MessageSquare size={20} />
                  </div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Top Channels Chart */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Channels by Songs</CardTitle>
                <Disc3 size={16} className="text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data?.channelStats ?? []}
                    margin={{ left: -20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="channelName"
                      tick={{
                        fill: "#52525b",
                        fontSize: 10,
                        fontFamily: "monospace",
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(v) =>
                        v.length > 10 ? v.slice(0, 10) + "…" : v
                      }
                    />
                    <YAxis
                      tick={{ fill: "#52525b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: 12,
                      }}
                      labelStyle={{ color: "#fff", fontSize: 12 }}
                      itemStyle={{ color: "#ef4444", fontSize: 12 }}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Bar
                      dataKey="songsCount"
                      fill="#ef4444"
                      radius={[6, 6, 0, 0]}
                      name="Songs"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Download Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Download Trend</CardTitle>
                <TrendingUp size={16} className="text-zinc-600" />
              </div>
              <p className="text-xs text-zinc-500">Last 7 days</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={data?.downloadTrend ?? []}
                    margin={{ left: -30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="_id"
                      tick={{ fill: "#52525b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis
                      tick={{ fill: "#52525b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: 12,
                      }}
                      labelStyle={{ color: "#fff", fontSize: 12 }}
                      itemStyle={{ color: "#ef4444", fontSize: 12 }}
                      cursor={{
                        stroke: "#ef4444",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Downloads"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Recent Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Users</CardTitle>
                <Clock size={16} className="text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {(data?.recentUsers ?? []).map((user: any) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                    >
                      <Avatar name={user.name || user.email} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.name || "Unnamed"}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          variant={user.role === "admin" ? "error" : "default"}
                        >
                          {user.role || "user"}
                        </Badge>
                        <p className="text-[10px] text-zinc-600 mt-1 font-mono">
                          {user.createdAt ? timeAgo(user.createdAt) : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Songs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recently Synced Songs</CardTitle>
                <Activity size={16} className="text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {(data?.recentSongs ?? []).map((song: any) => (
                    <div
                      key={song._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-900/60 to-red-950 flex items-center justify-center shrink-0">
                        <Music2 size={14} className="text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {song.title}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono truncate">
                          {song.artist}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-zinc-500 font-mono">
                          {song.duration ? formatDuration(song.duration) : "—"}
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                          @{song.channelUsername}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* ── Messages Modal ── */}
      <Dialog open={showMessages} onOpenChange={setShowMessages}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-400" />
              Developer Contact Messages
              <Badge variant="warning" className="ml-1">{messages.length}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto -mx-6 px-6 flex-1">
            {loadingMessages ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3 pb-2">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={m.name || m.email || "?"} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {m.name || "Anonymous"}
                          </p>
                          {m.email && (
                            <p className="text-xs text-zinc-500 font-mono flex items-center gap-1 truncate">
                              <Mail size={10} />
                              {m.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                        {m.createdAt ? timeAgo(m.createdAt) : "—"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
