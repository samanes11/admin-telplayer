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
  const channelDbId = searchParams.get("channelDbId") || "";
  const channelUsername = searchParams.get("channelUsername") || "";
  const skip = (page - 1) * limit;

  const query: any = {};
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { artist: { $regex: search, $options: "i" } },
    ];
  }
  if (channelDbId) query.channelDbId = channelDbId;
  if (channelUsername) query.channelUsername = channelUsername;

  const [songs, total] = await Promise.all([
    db
      .collection("songs")
      .find(query, { projection: { thumbnail: 0 } })
      .sort({ messageDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("songs").countDocuments(query),
  ]);

  return NextResponse.json({
    data: songs,
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

  await db.collection("songs").deleteOne({
    _id: new mongoose.Types.ObjectId(id),
  });

  return NextResponse.json({ success: true });
}
