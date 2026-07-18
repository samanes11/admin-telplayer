import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";

const SETTINGS_ID = "global_promotion";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const promo = await db
    .collection("app_settings")
    .findOne({ _id: SETTINGS_ID as any });

  return NextResponse.json({ data: promo || null });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const body = await req.json();
  const days = Number(body.days);

  if (!days || days <= 0 || !Number.isFinite(days)) {
    return NextResponse.json(
      { error: "A valid number of days is required" },
      { status: 400 },
    );
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await db.collection("app_settings").updateOne(
    { _id: SETTINGS_ID as any },
    {
      $set: {
        active: true,
        endDate,
        days,
        updatedAt: now,
        updatedBy: (session.user as any).email || null,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  return NextResponse.json({
    success: true,
    endDate,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  await db
    .collection("app_settings")
    .updateOne({ _id: SETTINGS_ID as any }, { $set: { active: false } });

  return NextResponse.json({ success: true });
}
