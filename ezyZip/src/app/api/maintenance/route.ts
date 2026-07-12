import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Asset from "@/models/Asset";
import ActivityLog from "@/models/ActivityLog";
import "@/models/User";
import "@/models/AssetCategory";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    
    const query: any = {};
    // Employee: only see their own requests
    if (user.role === "Employee") {
      query.raisedBy = user.id;
    }

    const requests = await MaintenanceRequest.find(query)
      .populate("asset", "name assetTag status")
      .populate("raisedBy", "name")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch maintenance requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Any authenticated user can raise a maintenance request
    await connectToDatabase();

    const request = await MaintenanceRequest.create({
      ...body,
      raisedBy: user.id,
      status: "Pending"
    });

    await ActivityLog.create({
      user: user.id,
      action: "Maintenance Raised",
      description: `Reported issue: ${body.description.substring(0, 50)}...`,
      entityType: "MaintenanceRequest",
      entityId: request._id
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create maintenance request" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { _id, status, resolutionNotes, technicianName } = await req.json();
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    
    const request = await MaintenanceRequest.findById(_id);
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const oldStatus = request.status;

    // RBAC for status transitions:
    // Approve/Reject: only Admin or AssetManager
    // TechnicianAssigned: only Admin or AssetManager
    // InProgress: Admin, AssetManager, or the assigned technician
    // Resolved: Admin, AssetManager
    // Employees can only raise requests (POST), not change status
    if (["Approved", "Rejected", "TechnicianAssigned"].includes(status)) {
      if (!hasRole(user, ["Admin", "AssetManager"])) {
        return forbidden("Only Admin or Asset Manager can approve, reject, or assign technicians");
      }
    } else if (status === "InProgress" || status === "Resolved") {
      if (!hasRole(user, ["Admin", "AssetManager"])) {
        return forbidden("Only Admin or Asset Manager can update maintenance progress");
      }
    }

    request.status = status;
    
    // On Approval: mark asset as Under Maintenance + record approver
    if (status === "Approved" && oldStatus === "Pending") {
      request.approvedBy = user.id;
      await Asset.findByIdAndUpdate(request.asset, { status: "Under Maintenance" });
    }
    
    if (technicianName) request.technicianName = technicianName;
    
    // On Resolution: revert asset to Available
    if (status === "Resolved") {
      request.resolutionNotes = resolutionNotes;
      request.resolvedAt = new Date();
      await Asset.findByIdAndUpdate(request.asset, { status: "Available" });
    }

    await request.save();

    await ActivityLog.create({
      user: user.id,
      action: `Maintenance ${status}`,
      description: `Status changed from ${oldStatus} to ${status}`,
      entityType: "MaintenanceRequest",
      entityId: request._id
    });

    return NextResponse.json(request);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update maintenance request" }, { status: 500 });
  }
}
