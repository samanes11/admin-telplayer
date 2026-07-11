import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import mongoose from "mongoose";

// GET /api/admin/playlists?userId=...        → list of a user's playlists
// GET /api/admin/playlists?id=...            → songs inside a specific playlist
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const db = getDb();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const playlistId = searchParams.get("id");

  // ── Songs inside a single playlist ─────────────────────────
  if (playlistId) {
    let objId: mongoose.Types.ObjectId;
    try {
      objId = new mongoose.Types.ObjectId(playlistId);
    } catch {
      return NextResponse.json(
        { error: "Invalid playlist id" },
        { status: 400 },
      );
    }

    const playlist = await db
      .collection("user_playlists")
      .findOne({ _id: objId });
    if (!playlist)
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 },
      );

    const songIds: string[] = playlist.songIds ?? [];
    const objIds = songIds
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const [songs, botSongs] = await Promise.all([
      db
        .collection("songs")
        .find({ _id: { $in: objIds } })
        .toArray(),
      db
        .collection("bot_songs")
        .find({ _id: { $in: objIds } })
        .toArray(),
    ]);

    const songMap = new Map(songs.map((s: any) => [s._id.toString(), s]));
    for (const bs of botSongs) {
      songMap.set(bs._id.toString(), {
        _id: bs._id,
        title: bs.title,
        artist: bs.artist,
        duration: bs.duration,
        fileSize: bs.fileSize,
      });
    }

    const ordered = songIds.map((id) => songMap.get(id)).filter(Boolean);

    return NextResponse.json({
      data: ordered,
      playlist: {
        _id: playlist._id,
        name: playlist.name,
        songsCount: songIds.length,
      },
    });
  }

  // ── Playlists for a user ────────────────────────────────────
  if (!userId)
    return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const playlists = await db
    .collection("user_playlists")
    .aggregate([
      { $match: { userIds: userId } },
      { $sort: { updatedAt: -1 } },
      {
        $addFields: {
          songsCount: { $size: { $ifNull: ["$songIds", []] } },
        },
      },
    ])
    .toArray();

  return NextResponse.json({ data: playlists });
}
