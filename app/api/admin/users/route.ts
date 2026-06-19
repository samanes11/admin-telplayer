import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
  const search = searchParams.get("search") || "";
  const skip   = (page - 1) * limit;

  const matchStage: Record<string, any> = {};
  if (search) {
    matchStage.$or = [
      { email: { $regex: search, $options: "i" } },
      { name:  { $regex: search, $options: "i" } },
    ];
  }

  /* ── single aggregate — replaces N×2 queries ── */
  const [result] = await db.collection("users").aggregate([
    { $match: matchStage },
    {
      $facet: {
        meta: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },

          // hide sensitive fields
          { $project: { password: 0, refreshToken: 0 } },

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

          // count downloads
          {
            $lookup: {
              from: "user_downloads",
              let: { uid: "$_userIdStr" },
              pipeline: [
                { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
                { $count: "n" },
              ],
              as: "_downloads",
            },
          },

          {
            $addFields: {
              channelCount:  { $ifNull: [{ $arrayElemAt: ["$_channels.n",  0] }, 0] },
              downloadCount: { $ifNull: [{ $arrayElemAt: ["$_downloads.n", 0] }, 0] },
            },
          },

          { $project: { _userIdStr: 0, _channels: 0, _downloads: 0 } },
        ],
      },
    },
  ]).toArray();

  const total      = result.meta[0]?.total ?? 0;
  const users      = result.data ?? [];
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ data: users, total, page, totalPages, hasMore: page < totalPages });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const body = await req.json();
  const { id, name, email, role, isActive, password } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const update: Record<string, any> = { updatedAt: new Date() };
  if (name     !== undefined) update.name     = name;
  if (email    !== undefined) update.email    = email.toLowerCase();
  if (role     !== undefined) update.role     = role;
  if (isActive !== undefined) update.isActive = isActive;
  if (password && password.length >= 6) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(password, salt);
  }

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
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // get channel IDs before deleting (needed for song cascade)
  const channels = await db
    .collection("telegram_channels")
    .find({ userId: id }, { projection: { _id: 1 } })
    .toArray();
  const channelIds = channels.map((c) => c._id.toString());

  // cascade delete — all in parallel
  await Promise.all([
    db.collection("users").deleteOne({ _id: objId }),
    db.collection("telegram_channels").deleteMany({ userId: id }),
    channelIds.length
      ? db.collection("telegram_songs").deleteMany({ channelDbId: { $in: channelIds } })
      : Promise.resolve(),
    db.collection("user_downloads").deleteMany({ userId: id }),
    db.collection("user_favorites").deleteMany({ userId: id }),
    db.collection("user_playlists").deleteMany({ userId: id }),
    db.collection("user_proxy_settings").deleteMany({ userId: id }),
  ]);

  return NextResponse.json({ success: true });
}
