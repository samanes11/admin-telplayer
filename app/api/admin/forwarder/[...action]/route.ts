
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL!;

// همون ADMIN_SECRET که در backend تنظیم شده
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-key": ADMIN_SECRET,
  };
}

async function checkAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") return false;
  return true;
}

// ── GET handler ────────────────────────────────────────────────
// Matches:
//   /api/admin/forwarder/jobs
//   /api/admin/forwarder/status/:jobId
async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: "Invalid response from backend", raw: text.slice(0, 500) };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { action: string[] } }
) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = params.action;
  let backendPath = "";

  if (action[0] === "jobs") {
    backendPath = `${BACKEND}/admin/forwarder/jobs`;
  } else if (action[0] === "status" && action[1]) {
    backendPath = `${BACKEND}/admin/forwarder/status/${action[1]}`;
  } else {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const res = await fetch(backendPath, {
      headers: adminHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    const data = await safeJson(res);
    if (data === null) {
      return NextResponse.json({ success: false, error: "Empty response from backend" }, { status: 502 });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to reach backend" },
      { status: 502 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { action: string[] } }
) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = params.action;
  let backendPath = "";
  let body: string | undefined;

  if (action[0] === "start") {
    backendPath = `${BACKEND}/admin/forwarder/start`;
    body = await req.text();
  } else if (action[0] === "cancel" && action[1]) {
    backendPath = `${BACKEND}/admin/forwarder/cancel/${action[1]}`;
  } else {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const res = await fetch(backendPath, {
      method: "POST",
      headers: adminHeaders(),
      ...(body ? { body } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const data = await safeJson(res);
    if (data === null) {
      return NextResponse.json({ success: false, error: "Empty response from backend" }, { status: 502 });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to reach backend" },
      { status: 502 },
    );
  }
}