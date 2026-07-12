import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { getSessionWithRole, unauthorized, forbidden, hasRole } from "@/lib/auth-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    const { id } = await params;
    await connectToDatabase();
    const asset = await Asset.findById(id)
      .populate("category", "name customFields")
      .populate("department", "name")
      .lean();
      
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Admin or AssetManager can update assets
    if (!hasRole(user, ["Admin", "AssetManager"])) {
      return forbidden("Only Admin or Asset Manager can update assets");
    }

    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();
    
    if (body.department === "") body.department = null;

    const asset = await Asset.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionWithRole();
    if (!user) return unauthorized();

    // Only Admin or AssetManager can dispose assets
    if (!hasRole(user, ["Admin", "AssetManager"])) {
      return forbidden("Only Admin or Asset Manager can dispose assets");
    }

    const { id } = await params;
    await connectToDatabase();
    // Soft delete: set status to Disposed
    const asset = await Asset.findByIdAndUpdate(id, { status: "Disposed" }, { new: true });
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
