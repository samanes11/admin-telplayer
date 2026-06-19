import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import mongoose from "mongoose";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const list = await db
    .collection("default_channels")
    .find()
    .sort({ addedAt: -1 })
    .toArray();

  return NextResponse.json({ data: list });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const body = await req.json();
  const channelUsername = (body.channelUsername || "").trim().replace("@", "");
  const channelName = (body.channelName || "").trim();

  if (!channelUsername || !channelName) {
    return NextResponse.json(
      { error: "channelUsername and channelName are required" },
      { status: 400 }
    );
  }

  const exists = await db.collection("default_channels").findOne({ channelUsername });
  if (exists) {
    return NextResponse.json(
      { error: "This channel is already a default channel" },
      { status: 400 }
    );
  }

  const doc = {
    channelUsername,
    channelName,
    addedAt: new Date(),
    addedBy: (session.user as any).email || null,
  };
  const result = await db.collection("default_channels").insertOne(doc);

  return NextResponse.json({ success: true, data: { _id: result.insertedId, ...doc } });
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

  await db.collection("default_channels").deleteOne({ _id: new mongoose.Types.ObjectId(id) });

  return NextResponse.json({ success: true });
}