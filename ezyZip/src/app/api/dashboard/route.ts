import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Asset from "@/models/Asset";
import Allocation from "@/models/Allocation";
import Booking from "@/models/Booking";
import ActivityLog from "@/models/ActivityLog";
import TransferRequest from "@/models/TransferRequest";

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Get KPI Counts
    const availableAssetsCount = await Asset.countDocuments({ status: "Available" });
    const allocatedAssetsCount = await Asset.countDocuments({ status: "Allocated" });
    const maintenanceAssetsCount = await Asset.countDocuments({ status: "Under Maintenance" });
    
    const activeBookingsCount = await Booking.countDocuments({ status: "Upcoming" }); // or Ongoing
    const pendingTransfersCount = await TransferRequest.countDocuments({ status: "Requested" });
    
    // Upcoming returns: Allocations where expectedReturnDate is in the future
    const now = new Date();
    const upcomingReturnsCount = await Allocation.countDocuments({
      status: "Active",
      expectedReturnDate: { $gt: now }
    });

    // Overdue returns: Allocations where expectedReturnDate is in the past
    const overdueReturnsCount = await Allocation.countDocuments({
      status: "Active",
      expectedReturnDate: { $lt: now }
    });

    // 2. Recent Activity Logs (last 10)
    const recentActivity = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name")
      .lean();

    return NextResponse.json({
      kpis: {
        available: availableAssetsCount,
        allocated: allocatedAssetsCount,
        maintenance: maintenanceAssetsCount,
        activeBookings: activeBookingsCount,
        pendingTransfers: pendingTransfersCount,
        upcomingReturns: upcomingReturnsCount,
        overdueReturns: overdueReturnsCount
      },
      recentActivity
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
