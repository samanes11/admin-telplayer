import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const sessions = await db
    .collection("user_sessions")
    .find({ userId })
    .sort({ lastActive: -1 })
    .toArray();

  return NextResponse.json({
    data: sessions.map((s: any) => ({
      _id: s._id,
      deviceName: s.deviceName || "Unknown Device",
      platform: s.platform || "Unknown",
      deviceId: s.deviceId || "",
      isActive: s.isActive !== false,
      createdAt: s.createdAt,
      lastActive: s.lastActive,
    })),
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

  await db
    .collection("user_sessions")
    .updateOne({ _id: id } as any, { $set: { isActive: false } });

  return NextResponse.json({ success: true });
}
