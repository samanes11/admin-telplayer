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
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "50"));
  const level = searchParams.get("level") || "";
  const search = searchParams.get("search") || "";
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {};
  if (level) query.level = level;
  if (search) query.message = { $regex: search, $options: "i" };

  const [logs, total] = await Promise.all([
    db
      .collection("logs")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection("logs").countDocuments(query),
  ]);

  return NextResponse.json({
    data: logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();
  await db.collection("logs").deleteMany({});
  return NextResponse.json({ success: true });
}
