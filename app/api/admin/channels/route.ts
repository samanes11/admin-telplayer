import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "15"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const userId = searchParams.get("userId") || "";
  const skip = (page - 1) * limit;

  // اگه userId فیلتر داره، اول از user_channels بگیر
  let channelUsernames: string[] | null = null;
  if (userId) {
    const userChannels = await db
      .collection("user_channels")
      .find({ userId })
      .project({ channelUsername: 1 })
      .toArray();
    channelUsernames = userChannels.map((c: any) => c.channelUsername);
  }

  const matchStage: Record<string, any> = {};
  if (search) {
    matchStage.$or = [
      { channelName: { $regex: search, $options: "i" } },
      { channelUsername: { $regex: search, $options: "i" } },
    ];
  }
  if (status) matchStage.status = status;
  if (channelUsernames) matchStage.channelUsername = { $in: channelUsernames };

  const [result] = await db
    .collection("channels")
    .aggregate([
      { $match: matchStage },
      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [
            { $sort: { lastSync: -1 } },
            { $skip: skip },
            { $limit: limit },

            // تعداد یوزرهایی که این چنل رو دارن
            {
              $lookup: {
                from: "user_channels",
                localField: "channelUsername",
                foreignField: "channelUsername",
                as: "_users",
              },
            },

            // تعداد آهنگ‌ها
            {
              $lookup: {
                from: "songs",
                let: { ch: "$channelUsername" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$channelUsername", "$$ch"] } } },
                  { $count: "n" },
                ],
                as: "_songCount",
              },
            },

            {
              $addFields: {
                userCount: { $size: "$_users" },
                songCount: {
                  $ifNull: [{ $arrayElemAt: ["$_songCount.n", 0] }, 0],
                },
              },
            },

            { $project: { _users: 0, _songCount: 0 } },
          ],
        },
      },
    ])
    .toArray();

  const total = result.meta[0]?.total ?? 0;
  const channels = result.data ?? [];
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ data: channels, total, page, totalPages });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // پیدا کن channelUsername
  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const channel = await db.collection("channels").findOne({ _id: objId });
  if (!channel)
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  // حذف از همه collections
  await Promise.all([
    db.collection("channels").deleteOne({ _id: objId }),
    db
      .collection("songs")
      .deleteMany({ channelUsername: channel.channelUsername }),
    db
      .collection("user_channels")
      .deleteMany({ channelUsername: channel.channelUsername }),
  ]);

  return NextResponse.json({ success: true });
}
