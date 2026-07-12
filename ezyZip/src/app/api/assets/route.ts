import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Asset from "@/models/Asset";
import "@/models/AssetCategory";
import "@/models/Department";
import { generateAssetTag } from "@/lib/asset-tag-generator";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const department = searchParams.get("department");

    await connectToDatabase();

    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { assetTag: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } }
      ];
    }
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (department) query.department = department;

    // Department Head: only see assets in their department
    if (user.role === "DepartmentHead" && user.department) {
      query.department = user.department;
    }

    const assets = await Asset.find(query)
      .populate("category", "name")
      .populate("department", "name")
      .lean();

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Fetch assets error:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Asset Manager or Admin can register new assets
    if (!hasRole(user, ["Admin", "AssetManager"])) {
      return forbidden("Only Asset Manager or Admin can register assets");
    }

    const body = await req.json();
    await connectToDatabase();
    
    // Convert empty string refs to null
    if (body.department === "") body.department = null;
    
    // Auto-generate tag if not provided
    if (!body.assetTag) {
      body.assetTag = await generateAssetTag();
    }

    const asset = await Asset.create(body);
    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    console.error("Create asset error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ error: "Asset Tag must be unique" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
