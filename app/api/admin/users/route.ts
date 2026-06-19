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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const query: any = {};
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.collection("users")
      .find(query, { projection: { password: 0, refreshToken: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("users").countDocuments(query),
  ]);

  // Enrich with channel + song counts per user
  const enriched = await Promise.all(
    users.map(async (user) => {
      const userId = user._id.toString();
      const [channelCount, downloadCount] = await Promise.all([
        db.collection("telegram_channels").countDocuments({ userId }),
        db.collection("user_downloads").countDocuments({ userId }),
      ]);
      return { ...user, channelCount, downloadCount };
    })
  );

  return NextResponse.json({
    data: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: page < Math.ceil(total / limit),
  });
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

  const update: any = { updatedAt: new Date() };
  if (name !== undefined) update.name = name;
  if (email !== undefined) update.email = email.toLowerCase();
  if (role !== undefined) update.role = role;
  if (isActive !== undefined) update.isActive = isActive;
  if (password && password.length >= 6) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(password, salt);
  }

  await db.collection("users").updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: update }
  );

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

  // Don't allow deleting yourself
  if (id === (session.user as any).id)
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await db.collection("users").deleteOne({ _id: new mongoose.Types.ObjectId(id) });
  // Cascade: remove their channels, songs, downloads, favorites, playlists
  const userId = id;
  const channels = await db.collection("telegram_channels").find({ userId }).toArray();
  const channelIds = channels.map((c) => c._id.toString());

  await Promise.all([
    db.collection("telegram_channels").deleteMany({ userId }),
    db.collection("telegram_songs").deleteMany({ channelDbId: { $in: channelIds } }),
    db.collection("user_downloads").deleteMany({ userId }),
    db.collection("user_favorites").deleteMany({ userId }),
    db.collection("user_playlists").deleteMany({ userId }),
    db.collection("user_proxy_settings").deleteMany({ userId }),
  ]);

  return NextResponse.json({ success: true });
}
