import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import mongoose from "mongoose";

const DEFAULT_PLANS = [
  {
    planId: "1m",
    title: "1 Month",
    days: 30,
    price: 49000,
    order: 1,
    isActive: true,
  },
  {
    planId: "3m",
    title: "3 Months",
    days: 90,
    price: 119000,
    order: 2,
    isActive: true,
  },
  {
    planId: "6m",
    title: "6 Months",
    days: 180,
    price: 199000,
    order: 3,
    isActive: true,
  },
];

async function ensureSeeded(db: any) {
  const count = await db.collection("subscription_plans").countDocuments();
  if (count === 0) {
    await db
      .collection("subscription_plans")
      .insertMany(
        DEFAULT_PLANS.map((p) => ({
          ...p,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();
  await ensureSeeded(db);

  const plans = await db
    .collection("subscription_plans")
    .find()
    .sort({ order: 1 })
    .toArray();
  return NextResponse.json({ data: plans });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const body = await req.json();
  const { planId, title, days, price, order, isActive } = body;

  if (!planId || !title || !days || price === undefined) {
    return NextResponse.json(
      { error: "planId, title, days and price are required" },
      { status: 400 },
    );
  }

  const exists = await db.collection("subscription_plans").findOne({ planId });
  if (exists) {
    return NextResponse.json(
      { error: "A plan with this ID already exists" },
      { status: 400 },
    );
  }

  const doc = {
    planId,
    title,
    days: Number(days),
    price: Number(price),
    order: order !== undefined ? Number(order) : 99,
    isActive: isActive !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("subscription_plans").insertOne(doc);
  return NextResponse.json({
    success: true,
    data: { _id: result.insertedId, ...doc },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const body = await req.json();
  const { id, title, days, price, order, isActive } = body;
  if (!id)
    return NextResponse.json({ error: "ID is required" }, { status: 400 });

  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const update: Record<string, any> = { updatedAt: new Date() };
  if (title !== undefined) update.title = title;
  if (days !== undefined) update.days = Number(days);
  if (price !== undefined) update.price = Number(price);
  if (order !== undefined) update.order = Number(order);
  if (isActive !== undefined) update.isActive = isActive;

  await db
    .collection("subscription_plans")
    .updateOne({ _id: objId }, { $set: update });
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
  if (!id)
    return NextResponse.json({ error: "ID is required" }, { status: 400 });

  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await db.collection("subscription_plans").deleteOne({ _id: objId });
  return NextResponse.json({ success: true });
}
