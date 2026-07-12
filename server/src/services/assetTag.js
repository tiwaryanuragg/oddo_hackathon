import { prisma } from "../config/prisma.js";

// Generates the next asset tag in AF-0001 format based on the highest existing tag.
export async function generateAssetTag() {
  const last = await prisma.asset.findFirst({
    where: { assetTag: { startsWith: "AF-" } },
    orderBy: { assetTag: "desc" },
    select: { assetTag: true },
  });

  let next = 1;
  if (last?.assetTag) {
    const num = parseInt(last.assetTag.replace("AF-", ""), 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `AF-${String(next).padStart(4, "0")}`;
}
