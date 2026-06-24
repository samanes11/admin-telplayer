import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { message, targetUserIds } = body;

  if (!message?.trim())
    return NextResponse.json({ error: "message required" }, { status: 400 });

  const res = await fetch(`${BACKEND}/admin/bot/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_SECRET,
    },
    body: JSON.stringify({ message, targetUserIds }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
