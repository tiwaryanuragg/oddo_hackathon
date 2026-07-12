import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuditCycle from "@/models/AuditCycle";
import AuditItem from "@/models/AuditItem";
import Asset from "@/models/Asset";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    const cycles = await AuditCycle.find()
      .populate("scopeDepartment", "name")
      .populate("auditors", "name")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(cycles);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch audit cycles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Admin can create audit cycles
    if (!hasRole(user, ["Admin"])) {
      return forbidden("Only Admin can create audit cycles");
    }

    const body = await req.json();
    await connectToDatabase();

    // 1. Create the Cycle
    const cycle = await AuditCycle.create(body);

    // 2. Determine assets in scope
    const assetQuery: any = {};
    if (body.scope === "Department" && body.scopeDepartment) {
      assetQuery.department = body.scopeDepartment;
    } else if (body.scope === "Location" && body.scopeLocation) {
      assetQuery.location = body.scopeLocation;
    }
    
    // Don't audit Disposed assets
    assetQuery.status = { $ne: "Disposed" };

    const assetsToAudit = await Asset.find(assetQuery).select("_id location");

    // 3. Create Audit Items for each asset
    if (assetsToAudit.length > 0) {
      const auditItems = assetsToAudit.map(a => ({
        auditCycle: cycle._id,
        asset: a._id,
        expectedLocation: a.location,
        verification: "Pending"
      }));
      await AuditItem.insertMany(auditItems);
    }

    return NextResponse.json(cycle, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create audit cycle" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Admin can close audit cycles
    if (!hasRole(user, ["Admin"])) {
      return forbidden("Only Admin can close audit cycles");
    }

    const { _id, status } = await req.json();
    await connectToDatabase();

    // When closing a cycle, update asset statuses based on audit findings
    if (status === "Closed") {
      const auditItems = await AuditItem.find({ auditCycle: _id });
      
      for (const item of auditItems) {
        if (item.verification === "Missing") {
          await Asset.findByIdAndUpdate(item.asset, { status: "Lost" });
        } else if (item.verification === "Damaged") {
          await Asset.findByIdAndUpdate(item.asset, { condition: "Poor" });
        }
      }
    }

    const cycle = await AuditCycle.findByIdAndUpdate(_id, { status }, { new: true });
    return NextResponse.json(cycle);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update audit cycle" }, { status: 500 });
  }
}
