import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Department from "@/models/Department";
import AssetCategory from "@/models/AssetCategory";
import Asset from "@/models/Asset";
import Allocation from "@/models/Allocation";
import Booking from "@/models/Booking";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import ActivityLog from "@/models/ActivityLog";

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    // 1. Get the specific user to assign assets to them
    const mainUser = await User.findOne({ email: "anuragmishra3407@gmail.com" });

    if (!mainUser) {
      return NextResponse.json({ error: "No users found. Please sign up first." }, { status: 400 });
    }

    // 2. Clear old demo data (only if we want to reset, but let's just delete models except User)
    await Department.deleteMany({});
    await AssetCategory.deleteMany({});
    await Asset.deleteMany({});
    await Allocation.deleteMany({});
    await Booking.deleteMany({});
    await MaintenanceRequest.deleteMany({});
    await ActivityLog.deleteMany({});

    // 3. Create Departments
    const deptIT = await Department.create({ name: "IT", description: "Information Technology" });
    const deptHR = await Department.create({ name: "HR", description: "Human Resources" });
    const deptOps = await Department.create({ name: "Operations", description: "Company Operations" });

    // 4. Create Categories
    const catLaptop = await AssetCategory.create({ name: "Laptops", description: "Computers" });
    const catMonitor = await AssetCategory.create({ name: "Monitors", description: "Displays" });
    const catVehicle = await AssetCategory.create({ name: "Vehicles", description: "Company Cars" });
    const catFurniture = await AssetCategory.create({ name: "Furniture", description: "Office Furniture" });

    // 5. Create Assets
    const assets = await Asset.insertMany([
      { name: "MacBook Pro M2", assetTag: "AST-LP-001", category: catLaptop._id, department: deptIT._id, status: "Allocated", condition: "Good", purchaseDate: new Date("2023-01-15") },
      { name: "Dell XPS 15", assetTag: "AST-LP-002", category: catLaptop._id, department: deptIT._id, status: "Available", condition: "New", purchaseDate: new Date("2023-06-20") },
      { name: "ThinkPad T14", assetTag: "AST-LP-003", category: catLaptop._id, department: deptIT._id, status: "Under Maintenance", condition: "Fair", purchaseDate: new Date("2022-03-10") },
      { name: "LG UltraWide 34\"", assetTag: "AST-MN-001", category: catMonitor._id, department: deptIT._id, status: "Available", condition: "Good", purchaseDate: new Date("2023-05-11") },
      { name: "Dell Ultrasharp 27\"", assetTag: "AST-MN-002", category: catMonitor._id, department: deptIT._id, status: "Allocated", condition: "Good", purchaseDate: new Date("2022-11-05") },
      { name: "Toyota Prius", assetTag: "AST-VH-001", category: catVehicle._id, department: deptOps._id, status: "Available", condition: "Good", purchaseDate: new Date("2021-08-22") },
      { name: "Ford Transit", assetTag: "AST-VH-002", category: catVehicle._id, department: deptOps._id, status: "Allocated", condition: "Fair", purchaseDate: new Date("2020-04-12") },
      { name: "ErgoChair Pro", assetTag: "AST-FR-001", category: catFurniture._id, department: deptHR._id, status: "Available", condition: "New", purchaseDate: new Date("2024-01-05") },
      { name: "Standing Desk", assetTag: "AST-FR-002", category: catFurniture._id, department: deptHR._id, status: "Allocated", condition: "Good", purchaseDate: new Date("2024-02-15") },
      { name: "MacBook Air M1", assetTag: "AST-LP-004", category: catLaptop._id, department: deptIT._id, status: "Available", condition: "Good", purchaseDate: new Date("2021-10-10") }
    ]);

    // 6. Create Allocations
    await Allocation.create({
      asset: assets[0]._id, // MacBook Pro M2
      user: mainUser._id,
      allocatedBy: mainUser._id,
      assignedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      status: "Active"
    });

    await Allocation.create({
      asset: assets[4]._id, // Dell Ultrasharp 27
      user: mainUser._id,
      allocatedBy: mainUser._id,
      assignedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      status: "Active"
    });

    await Allocation.create({
      asset: assets[8]._id, // Standing Desk
      user: mainUser._id,
      allocatedBy: mainUser._id,
      assignedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      status: "Active"
    });

    await Allocation.create({
      asset: assets[6]._id, // Ford Transit
      user: mainUser._id,
      allocatedBy: mainUser._id,
      assignedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
      returnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // returned 10 days ago
      status: "Returned"
    });

    // 7. Create Bookings
    await Booking.create({
      asset: assets[5]._id, // Toyota Prius
      bookedBy: mainUser._id,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Next 2 days
      startTime: "09:00",
      endTime: "17:00",
      status: "Upcoming",
      purpose: "Client meeting in another city"
    });

    await Booking.create({
      asset: assets[3]._id, // LG UltraWide
      bookedBy: mainUser._id,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), 
      startTime: "10:00",
      endTime: "14:00",
      status: "Completed",
      purpose: "Temporary setup for project"
    });

    // 8. Create Maintenance Requests
    await MaintenanceRequest.create({
      asset: assets[2]._id, // ThinkPad T14
      raisedBy: mainUser._id,
      description: "Several keys are stuck and not responding.",
      priority: "High",
      status: "InProgress",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    });

    await MaintenanceRequest.create({
      asset: assets[1]._id, // Dell XPS 15
      raisedBy: mainUser._id,
      description: "Battery lasts only 1 hour.",
      priority: "Medium",
      status: "Pending",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    });

    await MaintenanceRequest.create({
      asset: assets[6]._id, // Ford Transit
      raisedBy: mainUser._id,
      description: "Routine maintenance",
      priority: "Low",
      status: "Resolved",
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    });

    // 9. Create Activity Logs
    await ActivityLog.create({
      user: mainUser._id,
      action: "Created Asset",
      description: "Added MacBook Pro M2 to inventory",
      timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    });
    await ActivityLog.create({
      user: mainUser._id,
      action: "Allocated Asset",
      description: "Assigned MacBook Pro M2 to Anurag Mishra",
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    });
    await ActivityLog.create({
      user: mainUser._id,
      action: "Status Update",
      description: "ThinkPad T14 status changed to Under Maintenance",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    });

    return NextResponse.json({ message: "Database seeded successfully!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
