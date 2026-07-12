import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TransferRequest from "@/models/TransferRequest";
import Allocation from "@/models/Allocation";
import Asset from "@/models/Asset";
import ActivityLog from "@/models/ActivityLog";
import Notification from "@/models/Notification";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();

    const query: any = {};

    // Employee: only see transfers where they are fromUser or toUser
    if (user.role === "Employee") {
      query.$or = [
        { fromUser: user.id },
        { toUser: user.id }
      ];
    }

    const transfers = await TransferRequest.find(query)
      .populate("asset", "name assetTag")
      .populate("fromUser", "name")
      .populate("toUser", "name")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(transfers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();

    const assetRecord = await Asset.findById(body.asset);
    if (!assetRecord) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check if asset is actively allocated
    const activeAllocation = await Allocation.findOne({ 
      asset: body.asset, 
      status: "Active" 
    });

    const isAvailable = assetRecord.status === "Available";

    if (!activeAllocation && !isAvailable) {
      return NextResponse.json({ error: "Asset is neither actively allocated nor available" }, { status: 400 });
    }

    const currentHolderId = activeAllocation?.allocatedTo?.toString();

    // RBAC: The current holder can initiate a transfer, OR anyone can request it for themselves
    if (user.role === "Employee") {
      if (currentHolderId !== user.id && body.toUser !== user.id) {
        return forbidden("You can only request transfers for assets you hold, or request an asset for yourself");
      }
    } else if (user.role === "DepartmentHead") {
      // DeptHead can transfer assets within their department, their own assets, or request for themselves
      const assetInDept = assetRecord?.department?.toString() === user.department;
      const isHolder = currentHolderId === user.id;
      const isRequestingForSelf = body.toUser === user.id;
      if (!assetInDept && !isHolder && !isRequestingForSelf) {
        return forbidden("You can only transfer assets within your department, assets you hold, or request for yourself");
      }
    }
    // Admin and AssetManager can transfer any asset

    // Can't transfer to yourself
    const actualFromUser = activeAllocation ? (currentHolderId || user.id) : undefined;
    if (actualFromUser && body.toUser === actualFromUser) {
      return NextResponse.json({ error: "Cannot transfer asset to its current holder" }, { status: 400 });
    }

    // Set active allocation to TransferPending to prevent other actions
    if (activeAllocation) {
      activeAllocation.status = "TransferPending";
      await activeAllocation.save();
    } else {
      assetRecord.status = "Reserved";
      await assetRecord.save();
    }

    const transfer = await TransferRequest.create({
      asset: body.asset,
      fromUser: actualFromUser,
      toUser: body.toUser,
      reason: body.reason,
      status: "Requested"
    });

    await ActivityLog.create({
      user: user.id,
      action: "Transfer Requested",
      description: `Requested transfer for asset to a new user`,
      entityType: "TransferRequest",
      entityId: transfer._id
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create transfer request" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { _id, status } = await req.json(); // status = "Approved" | "Rejected"
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Admin, AssetManager, or DepartmentHead can approve/reject transfers
    if (!hasRole(user, ["Admin", "AssetManager", "DepartmentHead"])) {
      return forbidden("Only Admin, Asset Manager, or Department Head can approve/reject transfers");
    }

    await connectToDatabase();
    
    const transfer = await TransferRequest.findById(_id);
    if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // DepartmentHead can only approve within their department
    if (user.role === "DepartmentHead" && user.department) {
      const asset = await Asset.findById(transfer.asset);
      if (asset?.department?.toString() !== user.department) {
        return forbidden("You can only approve transfers within your department");
      }
    }

    transfer.status = status;
    transfer.approvedBy = user.id as any;
    await transfer.save();

    const activeAllocation = await Allocation.findOne({ 
      asset: transfer.asset, 
      status: "TransferPending" 
    });
    
    const asset = await Asset.findById(transfer.asset);

    if (status === "Approved") {
      if (activeAllocation) {
        // Return old allocation
        activeAllocation.status = "Returned";
        activeAllocation.actualReturnDate = new Date();
        activeAllocation.returnConditionNotes = "Transferred to another user";
        await activeAllocation.save();
      }

      // Create new allocation
      await Allocation.create({
        asset: transfer.asset,
        allocatedTo: transfer.toUser,
        allocatedBy: user.id,
        status: "Active"
      });

      if (asset) {
        asset.status = "Allocated";
        await asset.save();
      }
      
      // Notify new user
      await Notification.create({
        user: transfer.toUser,
        type: "Asset Assigned",
        message: `An asset transfer has been approved and assigned to you.`
      });

    } else if (status === "Rejected") {
      // Revert allocation status back to Active, or asset to Available
      if (activeAllocation) {
        activeAllocation.status = "Active";
        await activeAllocation.save();
      } else if (asset) {
        asset.status = "Available";
        await asset.save();
      }

      // Notify the requester
      await Notification.create({
        user: transfer.fromUser,
        type: "Transfer Rejected",
        message: `Your transfer request has been rejected.`
      });
    }

    await ActivityLog.create({
      user: user.id,
      action: `Transfer ${status}`,
      description: `Transfer request was ${status.toLowerCase()}`,
      entityType: "TransferRequest",
      entityId: transfer._id
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update transfer request" }, { status: 500 });
  }
}
