import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Asset from "@/models/Asset";
import ActivityLog from "@/models/ActivityLog";
import "@/models/User";
import "@/models/AssetCategory";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    
    const query: any = {};
    // Employee: only see their own bookings
    if (user.role === "Employee") {
      query.bookedBy = user.id;
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const bookings = await Booking.find(query)
      .populate("asset", "name assetTag")
      .populate("bookedBy", "name")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // All roles can book resources (Employee, DeptHead, AssetManager, Admin)
    await connectToDatabase();

    // 1. Validate Asset
    const asset = await Asset.findById(body.asset);
    if (!asset || !asset.isBookable) {
      return NextResponse.json({ error: "Asset is not available for booking" }, { status: 400 });
    }

    // 2. Overlap Validation
    const bookingDate = new Date(body.date);
    bookingDate.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(bookingDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      asset: body.asset,
      date: { $gte: bookingDate, $lte: endOfDay },
      status: { $in: ["Upcoming", "Ongoing"] }
    });

    const newStart = body.startTime;
    const newEnd = body.endTime;

    const isOverlap = existingBookings.some(b => {
      return (newStart < b.endTime) && (newEnd > b.startTime);
    });

    if (isOverlap) {
      return NextResponse.json({ 
        error: "Conflict: The resource is already booked for the selected time slot.",
        conflict: true
      }, { status: 409 });
    }

    // 3. Create Booking
    const booking = await Booking.create({
      ...body,
      bookedBy: user.id,
      status: "Upcoming"
    });

    await ActivityLog.create({
      user: user.id,
      action: "Resource Booked",
      description: `Booked ${asset.name} from ${newStart} to ${newEnd}`,
      entityType: "Booking",
      entityId: booking._id
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { _id, status } = await req.json();
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();

    const booking = await Booking.findById(_id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Employees can only cancel/update their own bookings
    if (user.role === "Employee" && booking.bookedBy.toString() !== user.id) {
      return forbidden("You can only manage your own bookings");
    }

    booking.status = status;
    await booking.save();
    
    await ActivityLog.create({
      user: user.id,
      action: `Booking ${status}`,
      description: `Booking was marked as ${status}`,
      entityType: "Booking",
      entityId: booking._id
    });

    return NextResponse.json(booking);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
