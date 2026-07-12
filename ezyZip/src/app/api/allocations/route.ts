import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Allocation from "@/models/Allocation";
import Asset from "@/models/Asset";
import ActivityLog from "@/models/ActivityLog";
import "@/models/User";
import "@/models/Department";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("asset");
    
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    
    const query: any = {};
    if (assetId) query.asset = assetId;

    // Role-based scoping:
    // Employee: only see their own allocations
    // DepartmentHead: see allocations within their department
    // Admin/AssetManager: see all
    if (user.role === "Employee") {
      query.allocatedTo = user.id;
    } else if (user.role === "DepartmentHead" && user.department) {
      query.allocatedToDepartment = user.department;
      // Also include their personal allocations
      if (!assetId) {
        query.$or = [
          { allocatedToDepartment: user.department },
          { allocatedTo: user.id }
        ];
        delete query.allocatedToDepartment;
      }
    }

    const allocations = await Allocation.find(query)
      .populate("asset", "name assetTag status")
      .populate("allocatedTo", "name email")
      .populate("allocatedToDepartment", "name")
      .populate("allocatedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(allocations);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch allocations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Admin, AssetManager, or DepartmentHead can allocate assets
    if (!hasRole(user, ["Admin", "AssetManager", "DepartmentHead"])) {
      return forbidden("Only Admin, Asset Manager, or Department Head can allocate assets");
    }

    await connectToDatabase();

    // 1. Conflict Check: Ensure asset is Available
    const asset = await Asset.findById(body.asset);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (asset.status !== "Available") {
      // Find who currently holds it
      const currentAllocation = await Allocation.findOne({ 
        asset: body.asset, 
        status: "Active" 
      }).populate("allocatedTo", "name");

      const holder = currentAllocation?.allocatedTo?.name || "another user";
      
      return NextResponse.json({ 
        error: `Conflict: This asset is currently held by ${holder}. Use Transfer Request instead.`,
        conflict: true,
        currentHolder: holder
      }, { status: 409 });
    }

    // DepartmentHead can only allocate within their department
    if (user.role === "DepartmentHead" && user.department) {
      if (body.allocatedToDepartment && body.allocatedToDepartment !== user.department) {
        return forbidden("Department Heads can only allocate assets within their own department");
      }
    }

    // Convert empty strings to null
    if (body.allocatedTo === "") body.allocatedTo = null;
    if (body.allocatedToDepartment === "") body.allocatedToDepartment = null;

    // 2. Create Allocation
    const allocation = await Allocation.create({
      ...body,
      allocatedBy: user.id,
      status: "Active"
    });

    // 3. Update Asset Status
    await Asset.findByIdAndUpdate(body.asset, { status: "Allocated" });

    // 4. Activity Log
    await ActivityLog.create({
      user: user.id,
      action: "Asset Allocated",
      description: `Allocated asset ${asset.assetTag}`,
      entityType: "Allocation",
      entityId: allocation._id
    });

    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    console.error("Allocation error:", error);
    return NextResponse.json({ error: "Failed to create allocation" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { _id, returnConditionNotes } = await req.json();
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Returns can be done by Admin, AssetManager, DeptHead, or the person who holds it
    await connectToDatabase();

    const allocation = await Allocation.findById(_id);
    if (!allocation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Employees can only return their own assets
    if (user.role === "Employee" && allocation.allocatedTo?.toString() !== user.id) {
      return forbidden("You can only return assets allocated to you");
    }

    // Mark returned
    allocation.status = "Returned";
    allocation.actualReturnDate = new Date();
    allocation.returnConditionNotes = returnConditionNotes || "";
    await allocation.save();

    // Revert Asset status
    await Asset.findByIdAndUpdate(allocation.asset, { status: "Available" });

    // Log Activity
    await ActivityLog.create({
      user: user.id,
      action: "Asset Returned",
      description: `Asset returned and condition logged`,
      entityType: "Allocation",
      entityId: allocation._id
    });

    return NextResponse.json(allocation);
  } catch (error) {
    return NextResponse.json({ error: "Failed to return asset" }, { status: 500 });
  }
}
