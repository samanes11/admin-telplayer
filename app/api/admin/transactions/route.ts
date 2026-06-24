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
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "10"));
  const status = searchParams.get("status") || "";
  const userId = searchParams.get("userId") || "";
  const skip = (page - 1) * limit;

  const matchStage: Record<string, any> = {};
  if (status) matchStage.status = status;
  if (userId) matchStage.userId = userId; 

  const [result] = await db
    .collection("subscription_orders")
    .aggregate([
      { $match: matchStage },
      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $addFields: {
                _userObjId: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: { $toString: "$userId" },
                        regex: /^[a-f\d]{24}$/i,
                      },
                    },
                    then: { $toObjectId: "$userId" },
                    else: null,
                  },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_userObjId",
                foreignField: "_id",
                as: "_user",
              },
            },
            {
              $addFields: {
                userEmail: { $arrayElemAt: ["$_user.email", 0] },
                userName: { $arrayElemAt: ["$_user.name", 0] },
              },
            },
            { $project: { _user: 0, _userObjId: 0 } },
          ],
        },
      },
    ])
    .toArray();

  const total = result.meta[0]?.total ?? 0;
  const transactions = result.data ?? [];
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ data: transactions, total, page, totalPages });
}
