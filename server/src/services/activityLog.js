import { prisma } from "../config/prisma.js";

// Fire-and-forget activity logger; never throws into the request flow.
export async function logActivity({ type, message, recipientId = null, actorId = null }) {
  try {
    await prisma.activityLog.create({
      data: { type, message, recipientId, actorId },
    });
  } catch (err) {
    console.error("[activityLog] failed:", err.message);
  }
}
