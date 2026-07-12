import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuditItem from "@/models/AuditItem";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId");
    
    if (!cycleId) return NextResponse.json({ error: "cycleId is required" }, { status: 400 });

    await connectToDatabase();
    const items = await AuditItem.find({ auditCycle: cycleId })
      .populate("asset", "name assetTag status location")
      .populate("verifiedBy", "name")
      .lean();
      
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch audit items" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { _id, verification } = await req.json();
    const session = await auth();

    await connectToDatabase();
    
    const item = await AuditItem.findByIdAndUpdate(_id, { 
      verification,
      verifiedBy: session?.user?.id,
      verifiedAt: new Date()
    }, { new: true });
    
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update audit item" }, { status: 500 });
  }
}
