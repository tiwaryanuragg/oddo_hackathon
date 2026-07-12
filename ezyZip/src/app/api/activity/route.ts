import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import "@/models/User";

import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role || "Employee";
    const isEmployee = role === "Employee";

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const type = searchParams.get("type");

    await connectToDatabase();

    const query: any = {};
    if (type) query.entityType = type;
    if (isEmployee) query.user = session.user.id;

    const logs = await ActivityLog.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}
