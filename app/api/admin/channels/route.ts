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
  const page   = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") || "15"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const skip   = (page - 1) * limit;

  /* ── build match stage ── */
  const matchStage: Record<string, any> = {};
  if (search) {
    matchStage.$or = [
      { channelName:     { $regex: search, $options: "i" } },
      { channelUsername: { $regex: search, $options: "i" } },
    ];
  }
  if (status) matchStage.status = status;

  /* ── single aggregate — no N+1 ── */
  const [result] = await db
    .collection("telegram_channels")
    .aggregate([
      { $match: matchStage },

      // total count before pagination
      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [
            { $sort: { addedAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            // convert userId string → ObjectId for $lookup
            {
              $addFields: {
                _userObjId: {
                  $cond: {
                    if: { $regexMatch: { input: "$userId", regex: /^[a-f\d]{24}$/i } },
                    then: { $toObjectId: "$userId" },
                    else: null,
                  },
                },
                _channelIdStr: { $toString: "$_id" },
              },
            },

            // join owner info
            {
              $lookup: {
                from: "users",
                localField: "_userObjId",
                foreignField: "_id",
                as: "_owner",
                pipeline: [{ $project: { email: 1, name: 1 } }],
              },
            },

            // count songs per channel
            {
              $lookup: {
                from: "telegram_songs",
                let: { chId: "$_channelIdStr" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$channelDbId", "$$chId"] } } },
                  { $count: "n" },
                ],
                as: "_songCount",
              },
            },

            // flatten
            {
              $addFields: {
                ownerEmail: { $arrayElemAt: ["$_owner.email", 0] },
                ownerName:  { $arrayElemAt: ["$_owner.name",  0] },
                songCount:  { $ifNull: [{ $arrayElemAt: ["$_songCount.n", 0] }, 0] },
              },
            },

            // clean up temp fields
            { $project: { _userObjId: 0, _channelIdStr: 0, _owner: 0, _songCount: 0 } },
          ],
        },
      },
    ])
    .toArray();

  const total      = result.meta[0]?.total ?? 0;
  const channels   = result.data ?? [];
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ data: channels, total, page, totalPages });
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

  let objId: mongoose.Types.ObjectId;
  try {
    objId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await db.collection("telegram_channels").deleteOne({ _id: objId });
  // songs store channelDbId as string
  await db.collection("telegram_songs").deleteMany({ channelDbId: id });

  return NextResponse.json({ success: true });
}
