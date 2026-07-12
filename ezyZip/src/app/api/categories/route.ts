import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AssetCategory from "@/models/AssetCategory";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    await connectToDatabase();
    const categories = await AssetCategory.find().lean();
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();
    if (!hasRole(user, ["Admin"])) {
      return forbidden("Only Admin can create asset categories");
    }

    const body = await req.json();
    await connectToDatabase();
    const category = await AssetCategory.create(body);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();
    if (!hasRole(user, ["Admin"])) {
      return forbidden("Only Admin can update asset categories");
    }

    const { _id, ...body } = await req.json();
    if (!_id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await connectToDatabase();
    const category = await AssetCategory.findByIdAndUpdate(_id, body, { new: true });
    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}
