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
    totalUsers, activeUsers,
    totalChannels, activeChannels,
    totalSongs,
    totalDownloads, completedDownloads,
    recentUsers, recentSongs,
  ] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments({ isActive: true }),
    db.collection("channels").countDocuments(),
    db.collection("channels").countDocuments({ status: "active" }),
    db.collection("songs").countDocuments(),
    db.collection("user_downloads").countDocuments(),
    db.collection("user_downloads").countDocuments({ status: "completed" }),
    db.collection("users")
      .find({}, { projection: { password: 0, refreshToken: 0 } })
      .sort({ createdAt: -1 }).limit(5).toArray(),
    db.collection("songs")
      .find({})
      .sort({ messageDate: -1 }).limit(5).toArray(),
  ]);

  // Songs per channel stats for chart
  const channelStats = await db.collection("channels").aggregate([
    { $lookup: {
      from: "songs",
      localField: "_id",
      foreignField: "channelDbId",
      as: "songs"
    }},
    { $project: {
      channelName: 1,
      channelUsername: 1,
      status: 1,
      songsCount: { $size: "$songs" },
      addedAt: 1,
    }},
    { $sort: { songsCount: -1 } },
    { $limit: 10 },
  ]).toArray();

  // Downloads trend (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const downloadTrend = await db.collection("user_downloads").aggregate([
    { $match: { startedAt: { $gte: sevenDaysAgo } } },
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
      count: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]).toArray();

  return NextResponse.json({
    users: { total: totalUsers, active: activeUsers },
    channels: { total: totalChannels, active: activeChannels },
    songs: { total: totalSongs },
    downloads: { total: totalDownloads, completed: completedDownloads },
    recentUsers,
    recentSongs,
    channelStats,
    downloadTrend,
  });
}
