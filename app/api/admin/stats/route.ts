import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import mongoose from "mongoose";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const db = getDb();

  const [
    totalUsers,
    activeUsers,
    totalChannels,
    activeChannels,
    totalSongs,
    botConnections,
    recentUsers,
    recentSongs,
    subscribedUsers,
  ] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments({ isActive: true }),
    db.collection("channels").countDocuments(),
    db.collection("channels").countDocuments({ status: "active" }),
    db.collection("songs").countDocuments(),
    db.collection("bot_connections").countDocuments({ isActive: true }),
    db
      .collection("users")
      .find({}, { projection: { password: 0, refreshToken: 0 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
    db
      .collection("songs")
      .find({})
      .sort({ messageDate: -1 })
      .limit(5)
      .toArray(),
    db.collection("users").countDocuments({
      subscriptionExpiresAt: { $gt: new Date() },
    }),
  ]);

  // Songs per channel stats for chart
  const channelStats = await db
    .collection("channels")
    .find({})
    .project({
      channelName: 1,
      channelUsername: 1,
      status: 1,
      songsCount: 1,
      addedAt: 1,
    })
    .sort({ songsCount: -1 })
    .limit(10)
    .toArray();

  // Downloads trend (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const deviceStats = await db
    .collection("user_sessions")
    .aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: {
            $cond: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$platform", ""] },
                  regex: /ios|iphone|ipad/i,
                },
              },
              "iOS",
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: { $ifNull: ["$platform", ""] },
                      regex: /android/i,
                    },
                  },
                  "Android",
                  "Other",
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();
  // Revenue & subscription purchase stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [revenueAgg, todayAgg, purchaseTrend] = await Promise.all([
    db
      .collection("subscription_orders")
      .aggregate([
        { $match: { status: "paid" } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ])
      .toArray(),
    db
      .collection("subscription_orders")
      .aggregate([
        { $match: { status: "paid", paidAt: { $gte: startOfToday } } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ])
      .toArray(),
    db
      .collection("subscription_orders")
      .aggregate([
        { $match: { status: "paid", paidAt: { $gte: startOfMonth } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  const revenue = {
    total: revenueAgg[0]?.total ?? 0,
    totalCount: revenueAgg[0]?.count ?? 0,
    todayTotal: todayAgg[0]?.total ?? 0,
    todayCount: todayAgg[0]?.count ?? 0,
  };

  return NextResponse.json({
    users: {
      total: totalUsers,
      active: activeUsers,
      subscribed: subscribedUsers,
    },
    channels: { total: totalChannels, active: activeChannels },
    songs: { total: totalSongs },
    bot: { connectedUsers: botConnections },
    recentUsers,
    recentSongs,
    channelStats,
    deviceStats,
    revenue,
    purchaseTrend,
  });
}
