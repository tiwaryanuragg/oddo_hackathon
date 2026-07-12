import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Department from "@/models/Department";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    const departments = await Department.find()
      .populate("head", "name email")
      .populate("parentDepartment", "name")
      .lean();
    return NextResponse.json(departments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();
    if (!hasRole(user, ["Admin"])) {
      return forbidden("Only Admin can create departments");
    }

    const body = await req.json();
    await connectToDatabase();
    
    const dataToSave = { ...body };
    if (dataToSave.head === "") delete dataToSave.head;
    if (dataToSave.parentDepartment === "") delete dataToSave.parentDepartment;

    const department = await Department.create(dataToSave);
    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();
    if (!hasRole(user, ["Admin"])) {
      return forbidden("Only Admin can update departments");
    }

    const { _id, ...body } = await req.json();
    if (!_id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await connectToDatabase();
    
    if (body.head === "") body.head = null;
    if (body.parentDepartment === "") body.parentDepartment = null;

    const department = await Department.findByIdAndUpdate(_id, body, { new: true });
    return NextResponse.json(department);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}
