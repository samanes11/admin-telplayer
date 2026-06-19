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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const skip = (page - 1) * limit;

  const query: any = {};
  if (search) {
    query.$or = [
      { channelName: { $regex: search, $options: "i" } },
      { channelUsername: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;

  const [channels, total] = await Promise.all([
    db.collection("telegram_channels")
      .find(query)
      .sort({ addedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("telegram_channels").countDocuments(query),
  ]);

  // Enrich: owner email
  const enriched = await Promise.all(
    channels.map(async (ch) => {
      const owner = await db.collection("users").findOne(
        { _id: new mongoose.Types.ObjectId(ch.userId) },
        { projection: { email: 1, name: 1 } }
      );
      const songCount = await db.collection("telegram_songs").countDocuments({
        channelDbId: ch._id.toString(),
      });
      return { ...ch, ownerEmail: owner?.email, ownerName: owner?.name, songCount };
    })
  );

  return NextResponse.json({
    data: enriched,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
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

  await db.collection("telegram_channels").deleteOne({
    _id: new mongoose.Types.ObjectId(id),
  });
  await db.collection("telegram_songs").deleteMany({ channelDbId: id });

  return NextResponse.json({ success: true });
}
