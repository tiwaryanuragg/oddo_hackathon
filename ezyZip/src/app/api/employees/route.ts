import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    const employees = await User.find()
      .select("-password")
      .populate("department", "name")
      .lean();
    return NextResponse.json(employees);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Admin can promote/demote roles and manage employee records
    if (!hasRole(user, ["Admin"])) {
      return forbidden("Only Admin can manage employee roles");
    }

    const { _id, role, department, status } = await req.json();
    if (!_id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    // Prevent Admin from demoting themselves (safety check)
    if (_id === user.id && role && role !== "Admin") {
      return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 });
    }

    await connectToDatabase();
    
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (department !== undefined) updateData.department = department === "" ? null : department;

    const updatedUser = await User.findByIdAndUpdate(_id, updateData, { new: true }).select("-password");
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}
