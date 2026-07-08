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
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const matchStage: Record<string, any> = {};
  if (search) {
    matchStage.$or = [
      { name: { $regex: search, $options: "i" } },
      { telegramUsername: { $regex: search, $options: "i" } },
      { telegramId: { $regex: search, $options: "i" } },
    ];
  }

  /* ── single aggregate — replaces N×2 queries ── */
  const [result] = await db
    .collection("users")
    .aggregate([
      { $match: matchStage },
      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            // hide sensitive fields
            { $project: { refreshToken: 0 } },

            // userId is stored as string in sub-collections
            { $addFields: { _userIdStr: { $toString: "$_id" } } },

            // count channels
            {
              $lookup: {
                from: "telegram_channels",
                let: { uid: "$_userIdStr" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
                  { $count: "n" },
                ],
                as: "_channels",
              },
            },

            {
              $addFields: {
                channelCount: {
                  $ifNull: [{ $arrayElemAt: ["$_channels.n", 0] }, 0],
                },
              },
            },
            {
              $addFields: {
                isPremium: {
                  $and: [
                    { $ne: ["$subscriptionExpiresAt", null] },
                    { $gt: ["$subscriptionExpiresAt", "$$NOW"] },
                  ],
                },
              },
            },

            { $project: { _userIdStr: 0, _channels: 0 } },
          ],
        },
      },
    ])
    .toArray();

  const total = result.meta[0]?.total ?? 0;
  const users = result.data ?? [];
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: users,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const body = await req.json();
  const { id, name, role, isActive } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const update: Record<string, any> = { updatedAt: new Date() };
  if (name !== undefined) update.name = name;
  if (role !== undefined) update.role = role;
  if (isActive !== undefined) update.isActive = isActive;

  await db.collection("users").updateOne({ _id: objId }, { $set: update });
  return NextResponse.json({ success: true });
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

  // prevent self-delete
  if (id === (session.user as any).id)
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 },
    );

  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // get channel IDs before deleting (needed for song cascade)
  const userChannels = await db
    .collection("user_channels")
    .find({ userId: id })
    .project({ channelUsername: 1 })
    .toArray();
  const channelUsernames = userChannels.map((c: any) => c.channelUsername);

  await Promise.all([
    db.collection("users").deleteOne({ _id: objId }),
    db.collection("user_channels").deleteMany({ userId: id }),
    db.collection("user_favorites").deleteMany({ userId: id }),
    db.collection("user_playlists").deleteMany({ userId: id }),
    db.collection("user_proxy_settings").deleteMany({ userId: id }),
  ]);

  // songs و channels رو فقط حذف کن اگه هیچ یوزر دیگه‌ای نداره
  for (const username of channelUsernames) {
    const otherUsers = await db
      .collection("user_channels")
      .countDocuments({ channelUsername: username });
    if (otherUsers === 0) {
      await db.collection("songs").deleteMany({ channelUsername: username });
      await db.collection("channels").deleteOne({ channelUsername: username });
    }
  }

  return NextResponse.json({ success: true });
}
