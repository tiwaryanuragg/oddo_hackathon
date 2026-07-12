import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Asset from "@/models/Asset";

export async function GET() {
  try {
    await connectToDatabase();
    
    // Aggregation for Assets by Status
    const statusData = await Asset.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Aggregation for Assets by Condition
    const conditionData = await Asset.aggregate([
      { $group: { _id: "$condition", count: { $sum: 1 } } }
    ]);
    
    // Total value of assets
    const valueData = await Asset.aggregate([
      { $group: { _id: null, totalValue: { $sum: "$acquisitionCost" } } }
    ]);

    return NextResponse.json({
      status: statusData,
      condition: conditionData,
      totalValue: valueData.length > 0 ? valueData[0].totalValue : 0
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
  }
}
