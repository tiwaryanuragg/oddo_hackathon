import { prisma } from "../config/prisma.js";
import { conflict, badRequest, notFound } from "../utils/ApiError.js";

// ------------------------------------------------------------------
// BLOCKING BUSINESS LOGIC
// ------------------------------------------------------------------

/**
 * Allocation conflict validator.
 * Rejects allocation unless the asset exists and its status is exactly 'Available'.
 * Returns the asset when valid.
 */
export async function validateAllocatable(assetId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw notFound("Asset not found");
  if (asset.status !== "Available") {
    throw conflict(
      `Asset ${asset.assetTag} cannot be allocated because its status is '${asset.status}'. Only 'Available' assets can be allocated.`
    );
  }
  return asset;
}

/**
 * Booking overlap validator.
 * Rejects a new booking if any active booking on the same resource overlaps the
 * requested window using the half-open rule: (start < existing.end && end > existing.start).
 * `excludeBookingId` lets an update skip its own record.
 */
export async function validateBookingWindow(resourceId, start, end, excludeBookingId = null) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw badRequest("Invalid start or end date");
  }
  if (endDate <= startDate) {
    throw badRequest("Booking end must be after start");
  }

  const asset = await prisma.asset.findUnique({ where: { id: resourceId } });
  if (!asset) throw notFound("Resource not found");
  if (!asset.isBookable) {
    throw conflict(`Asset ${asset.assetTag} is not marked as bookable`);
  }

  const overlap = await prisma.booking.findFirst({
    where: {
      resourceId,
      status: { in: ["Upcoming", "Ongoing"] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      // half-open overlap: start < existing.end AND end > existing.start
      start: { lt: endDate },
      end: { gt: startDate },
    },
  });

  if (overlap) {
    throw conflict(
      `Booking conflicts with an existing reservation (${overlap.start.toISOString()} → ${overlap.end.toISOString()}).`
    );
  }
  return asset;
}

/**
 * Maintenance gate.
 * Creating a maintenance request must NOT change the asset status.
 * The asset transitions to 'UnderMaintenance' ONLY when a Pending request is approved.
 * Returns the updated request + asset.
 */
export async function approveMaintenance(requestId, approverId, technicianId = null) {
  const request = await prisma.maintenanceRequest.findUnique({
    where: { id: requestId },
    include: { asset: true },
  });
  if (!request) throw notFound("Maintenance request not found");
  if (request.status !== "Pending") {
    throw conflict(`Only 'Pending' requests can be approved. Current status: '${request.status}'.`);
  }

  const [updatedRequest] = await prisma.$transaction([
    prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: technicianId ? "Assigned" : "Approved",
        approverId,
        ...(technicianId ? { technicianId } : {}),
      },
    }),
    // The gate: asset status only flips on approval.
    prisma.asset.update({
      where: { id: request.assetId },
      data: { status: "UnderMaintenance" },
    }),
  ]);

  return updatedRequest;
}
