import connectToDatabase from "./mongodb";
import Asset from "@/models/Asset";

export async function generateAssetTag(): Promise<string> {
  await connectToDatabase();
  
  // Find the asset with the highest tag number
  const lastAsset = await Asset.findOne()
    .sort({ assetTag: -1 })
    .collation({ locale: "en_US", numericOrdering: true });
    
  if (!lastAsset || !lastAsset.assetTag) {
    return "AF-0001";
  }
  
  // Extract number from AF-XXXX
  const lastNumberStr = lastAsset.assetTag.replace("AF-", "");
  const lastNumber = parseInt(lastNumberStr, 10);
  
  if (isNaN(lastNumber)) {
    return "AF-0001"; // Fallback
  }
  
  const nextNumber = lastNumber + 1;
  const nextTag = `AF-${nextNumber.toString().padStart(4, "0")}`;
  
  return nextTag;
}
