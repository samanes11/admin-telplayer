"use client";

import { useEffect, useState, useCallback } from "react";
import Topbar from "@/components/dashboard/Topbar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
} from "@/components/ui";
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Radio,
  Music2,
  Users,
  Download,
  BarChart3,
  DollarSign,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";

const COLORS = [
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
];

const tooltipStyle = {
  contentStyle: {
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: "#fff" },
  itemStyle: { color: "#a1a1aa" },
  cursor: { fill: "rgba(255,255,255,0.02)" },
};

interface Transaction {
  orderId: string;
  userEmail?: string;
  userName?: string;
  planTitle?: string;
  planId: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  createdAt: string;
  paidAt?: string;
  testMode?: boolean;
}

const statusBadge = {
  paid: { label: "Paid", variant: "success" as const },
  pending: { label: "Pending", variant: "warning" as const },
  failed: { label: "Failed", variant: "error" as const },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const loadTransactions = useCallback(async (p = 1) => {
    setTxLoading(true);
    const res = await fetch(`/api/admin/transactions?page=${p}&limit=10`);
    const d = await res.json();
    setTransactions(d.data || []);
    setTxTotal(d.total || 0);
    setTxTotalPages(d.totalPages || 1);
    setTxLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions(1);
  }, [loadTransactions]);

  const pieData = data
    ? [
        { name: "Subscribed", value: data.revenue?.totalCount ?? 0 },
        {
          name: "Free",
          value: (data.users?.total ?? 0) - (data.revenue?.totalCount ?? 0),
        },
      ]
    : [];

  return (
    <div>
      <Topbar title="Analytics" subtitle="Platform insights and statistics" />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {(
            [
              {
                label: "Purchases Today",
                value: data ? (data.revenue?.todayCount ?? 0) : "—",
                sub: `$${(data?.revenue?.todayTotal ?? 0).toLocaleString()} revenue`,
                icon: <CreditCard size={18} />,
                color: "text-amber-400 bg-amber-500/10",
              },
              {
                label: "Download Rate",
                value: data
                  ? data.downloads?.total > 0
                    ? Math.round(
                        (data.downloads?.completed / data.downloads?.total) *
                          100,
                      ) + "%"
                    : "0%"
                  : "—",
                sub: "completion rate",
                icon: <Download size={18} />,
                color: "text-red-400 bg-red-500/10",
              },
              {
                label: "Total Songs",
                value: data
                  ? data.songs?.total > 0
                    ? data.songs?.total
                    : 0
                  : "—",
                sub: "Songs",
                icon: <Music2 size={18} />,
                color: "text-emerald-400 bg-emerald-500/10",
              },
              {
                label: "Subscribed Users",
                value: data
                  ? data.users?.total > 0
                    ? Math.round(
                        ((data.revenue?.totalCount ?? 0) / data.users?.total) *
                          100,
                      ) + "%"
                    : "0%"
                  : "—",
                sub: `${data?.revenue?.totalCount ?? 0} paid subscriptions`,
                icon: <Users size={18} />,
                color: "text-purple-400 bg-purple-500/10",
              },
            ] as const
          ).map((kpi, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  {kpi.label}
                </p>
                <div className={`p-2 rounded-xl ${kpi.color}`}>{kpi.icon}</div>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold text-white font-mono">
                  {kpi.value}
                </p>
              )}
              <p className="text-xs text-zinc-600 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Daily purchases this month */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Daily Purchases (This Month)</CardTitle>
                <DollarSign size={16} className="text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56" />
              ) : (data?.purchaseTrend ?? []).length === 0 ? (
                <div className="text-center py-12 text-zinc-600">
                  <CreditCard size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No purchases yet this month</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={data?.purchaseTrend ?? []}
                    margin={{ left: -20, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="_id"
                      tick={{ fill: "#52525b", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.slice(8)}
                    />
                    <YAxis
                      tick={{ fill: "#52525b", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: any) => [value, "Purchases"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      name="Purchases"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56" />
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={i === 0 ? "#ef4444" : "#27272a"}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#18181b",
                          border: "1px solid #27272a",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex gap-4 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-xs text-zinc-400">
                        Subscribed ({data?.revenue?.totalCount ?? 0})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-zinc-700" />
                      <span className="text-xs text-zinc-400">
                        Free (
                        {(data?.users?.total ?? 0) -
                          (data?.revenue?.totalCount ?? 0)}
                        )
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Songs per Channel (Top 10)</CardTitle>
                <BarChart3 size={16} className="text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={data?.channelStats ?? []}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: "#52525b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="channelName"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                      tickFormatter={(v) =>
                        v.length > 12 ? v.slice(0, 12) + "…" : v
                      }
                    />
                    <Tooltip {...tooltipStyle} />
                    <Bar
                      dataKey="songsCount"
                      fill="#ef4444"
                      radius={[0, 6, 6, 0]}
                      name="Songs"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    {
                      label: "Total Users",
                      value: data?.users?.total?.toLocaleString(),
                      badge: "default" as const,
                    },
                    {
                      label: "Total Channels",
                      value: data?.channels?.total?.toLocaleString(),
                      badge: "purple" as const,
                    },
                    {
                      label: "Total Songs",
                      value: data?.songs?.total?.toLocaleString(),
                      badge: "default" as const,
                    },
                    {
                      label: "Total Revenue",
                      value: `$${(data?.revenue?.total ?? 0).toLocaleString()}`,
                      badge: "success" as const,
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="text-sm text-zinc-400">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-white">
                          {row.value ?? "—"}
                        </span>
                        <Badge
                          variant={row.badge}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {row.badge === "success" ? "✓" : "•"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Transactions</CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  {txTotal.toLocaleString()} total orders
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTransactions(txPage)}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-16 text-zinc-600"
                    >
                      <CreditCard
                        size={32}
                        className="mx-auto mb-3 opacity-30"
                      />
                      <p className="text-sm">No transactions yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const st = statusBadge[tx.status] || statusBadge.pending;
                    return (
                      <TableRow key={tx.orderId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-400">
                              #{tx.orderId.slice(0, 8)}
                            </span>
                            {tx.testMode && (
                              <Badge
                                variant="warning"
                                className="text-[9px] px-1.5 py-0"
                              >
                                TEST
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-zinc-300">
                            {tx.userName || "—"}
                          </p>
                          <p className="text-xs text-zinc-600 font-mono">
                            {tx.userEmail || "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-zinc-400">
                            {tx.planTitle || tx.planId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono font-semibold text-white">
                            ${tx.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-zinc-500 font-mono">
                            {timeAgo(tx.createdAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 font-mono">
                Page {txPage} of {txTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={txPage <= 1}
                  onClick={() => {
                    const np = txPage - 1;
                    setTxPage(np);
                    loadTransactions(np);
                  }}
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={txPage >= txTotalPages}
                  onClick={() => {
                    const np = txPage + 1;
                    setTxPage(np);
                    loadTransactions(np);
                  }}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
