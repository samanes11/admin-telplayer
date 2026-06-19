import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const defaults = await db.collection("default_channels").find().toArray();
  if (defaults.length === 0) {
    return NextResponse.json({
      success: true,
      added: 0,
      usersProcessed: 0,
      message: "No default channels configured",
    });
  }

  const users = await db
    .collection("users")
    .find({ isActive: true })
    .project({ _id: 1 })
    .toArray();

  let added = 0;
  for (const user of users) {
    const userId = user._id.toString();
    const existingChannels = await db
      .collection("telegram_channels")
      .find({ userId })
      .project({ channelUsername: 1 })
      .toArray();
    const existingUsernames = new Set(existingChannels.map((c: any) => c.channelUsername));

    for (const dc of defaults) {
      if (existingUsernames.has(dc.channelUsername)) continue;
      await db.collection("telegram_channels").insertOne({
        userId,
        channelUsername: dc.channelUsername,
        channelName: dc.channelName,
        photoUrl: null,
        status: "pending",
        songsCount: 0,
        addedAt: new Date(),
        isDefault: true,
      });
      added++;
    }
  }

  return NextResponse.json({ success: true, added, usersProcessed: users.length });
}