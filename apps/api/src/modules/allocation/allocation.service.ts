import { AssetStatus, AssetEventType, AllocationStatus, TransferStatus, ReturnStatus } from '@assetflow/shared';
import { AppError } from '../../core/errors/app-error.js';
import { eventBus } from '../../core/events/index.js';
import type { AssetService } from '../assets/asset.service.js';
import type { AllocationRepositoryContract } from './allocation.repository.js';
import {
  toAllocationDto,
  toTransferDto,
  toReturnDto,
  type AllocationDto,
  type TransferDto,
  type ReturnDto,
  type PaginatedAllocations,
  type PaginatedTransfers,
  type PaginatedReturns,
} from './allocation.mapper.js';
import type {
  IssueAllocationInput,
  RevokeAllocationInput,
  AllocationQuery,
  CreateTransferInput,
  DecideTransferInput,
  TransferQuery,
  RequestReturnInput,
  ProcessReturnInput,
  ReturnQuery,
} from './allocation.schema.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paginate<T>(items: T[], total: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Allocation use-case orchestrator.
 *
 * Depends on:
 *  - AllocationRepository — all DB operations for this module
 *  - AssetService.transitionStatus — to mutate asset status after business events
 *
 * All conflict-detection rules live here, not in the repository or controller.
 */
export class AllocationService {
  constructor(
    private readonly repo: AllocationRepositoryContract,
    private readonly assetService: AssetService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════════
  //  ALLOCATIONS
  // ══════════════════════════════════════════════════════════════════════════════

  async listAllocations(query: AllocationQuery): Promise<PaginatedAllocations> {
    const { items, total } = await this.repo.findAllocations(query);
    return paginate(items.map(toAllocationDto), total, query.page, query.limit);
  }

  async getAllocationById(id: string): Promise<AllocationDto> {
    const a = await this.repo.findAllocationById(id);
    if (!a) throw AppError.notFound('Allocation not found');
    return toAllocationDto(a);
  }

  /**
   * Issue an allocation: asset must be AVAILABLE, no conflicting active
   * allocation may exist, asset transitions to ALLOCATED.
   */
  async issueAllocation(input: IssueAllocationInput, actorId: string): Promise<AllocationDto> {
    // ── Conflict detection ──────────────────────────────────────────────────
    const existing = await this.repo.findActiveAllocationForAsset(input.assetId);
    if (existing) {
      throw AppError.conflict(
        'Asset already has an active allocation. Return it first before allocating to someone else.',
        'ALLOCATION_CONFLICT' as never,
      );
    }

    // ── Asset must be AVAILABLE ─────────────────────────────────────────────
    // We read current state from the asset service's transitionStatus; it will
    // throw if the current status does not allow ALLOCATED.
    // We just verify the status via the service's internal read.
    const assetDto = await this.assetService.getById(input.assetId);
    if (assetDto.status !== AssetStatus.AVAILABLE) {
      throw AppError.conflict(
        `Asset is not available for allocation. Current status: ${assetDto.status}`,
      );
    }

    // ── Create allocation record ────────────────────────────────────────────
    const allocation = await this.repo.createAllocation({
      assetId:   input.assetId,
      holderId:  input.holderId,
      issuedById: actorId,
      dueDate:   input.dueDate ?? null,
      note:      input.note ?? null,
    });

    // ── Transition asset to ALLOCATED ───────────────────────────────────────
    await this.assetService.transitionStatus(
      input.assetId,
      AssetStatus.ALLOCATED,
      actorId,
      'Allocated to user',
      { allocationId: allocation.id, holderId: input.holderId },
    );

    // ── Update asset assignedTo ─────────────────────────────────────────────
    // We piggy-back on the asset update path; this is a denormalized fast-path
    // for "my assets" queries. The authoritative source is the Allocation record.
    await this.assetService['repo'].update(input.assetId, { assignedToId: input.holderId });

    eventBus.emit('audit.activity', {
      action: 'allocation.issued',
      entityType: 'Allocation',
      entityId: allocation.id,
      actorId,
      metadata: { assetId: input.assetId, holderId: input.holderId },
    });

    return toAllocationDto(allocation);
  }

  /**
   * Revoke an allocation administratively (MANAGER/ADMIN). Asset goes back to
   * AVAILABLE.
   */
  async revokeAllocation(id: string, input: RevokeAllocationInput, actorId: string): Promise<AllocationDto> {
    const allocation = await this.repo.findAllocationById(id);
    if (!allocation) throw AppError.notFound('Allocation not found');

    if (allocation.status !== AllocationStatus.ACTIVE) {
      throw AppError.conflict(`Cannot revoke an allocation with status ${allocation.status}`);
    }

    const updated = await this.repo.updateAllocationStatus(id, AllocationStatus.REVOKED);

    await this.assetService.transitionStatus(
      allocation.assetId,
      AssetStatus.AVAILABLE,
      actorId,
      `Allocation revoked: ${input.reason}`,
      { allocationId: id, reason: input.reason },
    );

    // Clear denormalized assignedTo
    await this.assetService['repo'].update(allocation.assetId, { assignedToId: null });

    eventBus.emit('audit.activity', {
      action: 'allocation.revoked',
      entityType: 'Allocation',
      entityId: id,
      actorId,
      metadata: { reason: input.reason },
    });

    return toAllocationDto(updated);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //  TRANSFER REQUESTS
  // ══════════════════════════════════════════════════════════════════════════════

  async listTransfers(query: TransferQuery): Promise<PaginatedTransfers> {
    const { items, total } = await this.repo.findTransfers(query);
    return paginate(items.map(toTransferDto), total, query.page, query.limit);
  }

  async getTransferById(id: string): Promise<TransferDto> {
    const t = await this.repo.findTransferById(id);
    if (!t) throw AppError.notFound('Transfer request not found');
    return toTransferDto(t);
  }

  /**
   * Request a transfer: the requester is usually the current holder or a
   * manager. The asset must be actively allocated and have no pending transfer.
   */
  async requestTransfer(input: CreateTransferInput, actorId: string): Promise<TransferDto> {
    // ── Check for existing active allocation ────────────────────────────────
    const activeAllocation = await this.repo.findActiveAllocationForAsset(input.assetId);
    if (!activeAllocation) {
      throw AppError.conflict('Asset has no active allocation to transfer from');
    }

    // ── Conflict: only one pending transfer per asset ───────────────────────
    const pendingTransfer = await this.repo.findPendingTransferForAsset(input.assetId);
    if (pendingTransfer) {
      throw AppError.conflict(
        'A pending transfer request already exists for this asset. Cancel it first.',
      );
    }

    // ── Cannot transfer to the same person ─────────────────────────────────
    if (activeAllocation.holderId === input.toUserId) {
      throw AppError.badRequest('The asset is already allocated to this user');
    }

    const transfer = await this.repo.createTransfer({
      assetId:       input.assetId,
      allocationId:  activeAllocation.id,
      fromUserId:    activeAllocation.holderId,
      toUserId:      input.toUserId,
      requestedById: actorId,
      reason:        input.reason ?? null,
    });

    // Mark the allocation as RETURN_REQUESTED state for visibility
    await this.repo.updateAllocationStatus(activeAllocation.id, AllocationStatus.RETURN_REQUESTED);

    eventBus.emit('audit.activity', {
      action: 'transfer.requested',
      entityType: 'TransferRequest',
      entityId: transfer.id,
      actorId,
      metadata: { assetId: input.assetId, toUserId: input.toUserId },
    });

    return toTransferDto(transfer);
  }

  /**
   * Approve or reject a transfer.
   *
   * Approve flow:
   *  1. Mark old allocation RETURNED
   *  2. Create a fresh allocation for toUser
   *  3. Mark transfer APPROVED → COMPLETED
   *  4. Update asset assignedTo
   *
   * Reject flow:
   *  1. Mark transfer REJECTED
   *  2. Restore old allocation to ACTIVE
   */
  async decideTransfer(id: string, input: DecideTransferInput, actorId: string): Promise<TransferDto> {
    const transfer = await this.repo.findTransferById(id);
    if (!transfer) throw AppError.notFound('Transfer request not found');

    if (transfer.status !== TransferStatus.PENDING) {
      throw AppError.conflict(`Transfer request is already ${transfer.status}`);
    }

    const now = new Date();

    if (input.decision === 'approve') {
      // ── Close old allocation ──────────────────────────────────────────────
      if (transfer.allocationId) {
        await this.repo.updateAllocationStatus(transfer.allocationId, AllocationStatus.RETURNED, now);
      }

      // ── Create new allocation for recipient ───────────────────────────────
      const newAllocation = await this.repo.createAllocation({
        assetId:   transfer.assetId,
        holderId:  transfer.toUserId,
        issuedById: actorId,
        note:      `Transferred from ${transfer.fromUser.firstName} ${transfer.fromUser.lastName}`,
      });

      // ── Update asset assignedTo ───────────────────────────────────────────
      await this.assetService['repo'].update(transfer.assetId, { assignedToId: transfer.toUserId });

      // ── Append event to asset ledger ──────────────────────────────────────
      await this.assetService['repo'].appendEvent({
        assetId: transfer.assetId,
        type:    AssetEventType.TRANSFERRED,
        note:    `Transferred to ${transfer.toUser.firstName} ${transfer.toUser.lastName}`,
        actorId,
        metadata: {
          transferId:       id,
          fromUserId:       transfer.fromUserId,
          toUserId:         transfer.toUserId,
          newAllocationId:  newAllocation.id,
        },
      });

      const updated = await this.repo.updateTransferStatus(id, TransferStatus.COMPLETED, {
        approverId:   actorId,
        decisionNote: input.decisionNote ?? undefined,
        decidedAt:    now,
      });

      eventBus.emit('audit.activity', {
        action: 'transfer.approved',
        entityType: 'TransferRequest',
        entityId: id,
        actorId,
        metadata: { toUserId: transfer.toUserId },
      });

      return toTransferDto(updated);

    } else {
      // ── Reject: restore old allocation to ACTIVE ──────────────────────────
      if (transfer.allocationId) {
        await this.repo.updateAllocationStatus(transfer.allocationId, AllocationStatus.ACTIVE);
      }

      const updated = await this.repo.updateTransferStatus(id, TransferStatus.REJECTED, {
        approverId:   actorId,
        decisionNote: input.decisionNote ?? undefined,
        decidedAt:    now,
      });

      eventBus.emit('audit.activity', {
        action: 'transfer.rejected',
        entityType: 'TransferRequest',
        entityId: id,
        actorId,
        metadata: { decisionNote: input.decisionNote },
      });

      return toTransferDto(updated);
    }
  }

  /**
   * Cancel a transfer request. Only the requester or a manager may cancel.
   */
  async cancelTransfer(id: string, actorId: string): Promise<TransferDto> {
    const transfer = await this.repo.findTransferById(id);
    if (!transfer) throw AppError.notFound('Transfer request not found');

    if (transfer.status !== TransferStatus.PENDING) {
      throw AppError.conflict(`Cannot cancel a transfer with status ${transfer.status}`);
    }

    // Restore allocation to ACTIVE
    if (transfer.allocationId) {
      await this.repo.updateAllocationStatus(transfer.allocationId, AllocationStatus.ACTIVE);
    }

    const updated = await this.repo.updateTransferStatus(id, TransferStatus.CANCELLED, {
      decidedAt: new Date(),
    });

    eventBus.emit('audit.activity', {
      action: 'transfer.cancelled',
      entityType: 'TransferRequest',
      entityId: id,
      actorId,
    });

    return toTransferDto(updated);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //  RETURNS
  // ══════════════════════════════════════════════════════════════════════════════

  async listReturns(query: ReturnQuery): Promise<PaginatedReturns> {
    const { items, total } = await this.repo.findReturns(query);
    return paginate(items.map(toReturnDto), total, query.page, query.limit);
  }

  async getReturnById(id: string): Promise<ReturnDto> {
    const r = await this.repo.findReturnById(id);
    if (!r) throw AppError.notFound('Return record not found');
    return toReturnDto(r);
  }

  /**
   * Employee requests to return an asset they hold.
   * Conflict: only one active return request allowed per allocation.
   */
  async requestReturn(input: RequestReturnInput, actorId: string): Promise<ReturnDto> {
    const allocation = await this.repo.findAllocationById(input.allocationId);
    if (!allocation) throw AppError.notFound('Allocation not found');

    if (allocation.status !== AllocationStatus.ACTIVE) {
      throw AppError.conflict(`Allocation is already ${allocation.status}`);
    }

    // ── Conflict: only one pending return ────────────────────────────────────
    const pendingReturn = await this.repo.findPendingReturnForAllocation(input.allocationId);
    if (pendingReturn) {
      throw AppError.conflict('A return request is already in progress for this allocation');
    }

    const ret = await this.repo.createReturn({
      allocationId:      input.allocationId,
      submittedById:     actorId,
      reportedCondition: input.reportedCondition,
      note:              input.note ?? null,
    });

    // Signal allocation is return-requested
    await this.repo.updateAllocationStatus(input.allocationId, AllocationStatus.RETURN_REQUESTED);

    eventBus.emit('audit.activity', {
      action: 'return.requested',
      entityType: 'Return',
      entityId: ret.id,
      actorId,
      metadata: { allocationId: input.allocationId },
    });

    return toReturnDto(ret);
  }

  /**
   * Manager/Admin approves or rejects a return.
   *
   * Approve flow:
   *  1. Close the allocation (RETURNED)
   *  2. Transition asset back to AVAILABLE
   *  3. Update asset condition to reported condition
   *  4. Clear asset assignedTo
   *
   * Reject flow:
   *  1. Restore allocation to ACTIVE
   *  2. Mark return as REJECTED
   */
  async processReturn(id: string, input: ProcessReturnInput, actorId: string): Promise<ReturnDto> {
    const ret = await this.repo.findReturnById(id);
    if (!ret) throw AppError.notFound('Return record not found');

    if (ret.status !== ReturnStatus.REQUESTED) {
      throw AppError.conflict(`Return is already ${ret.status}`);
    }

    const now = new Date();

    if (input.decision === 'approve') {
      // ── Close allocation ──────────────────────────────────────────────────
      await this.repo.updateAllocationStatus(ret.allocationId, AllocationStatus.RETURNED, now);

      // ── Transition asset to AVAILABLE ─────────────────────────────────────
      await this.assetService.transitionStatus(
        ret.allocation.assetId,
        AssetStatus.AVAILABLE,
        actorId,
        'Asset returned by holder',
        { returnId: id, reportedCondition: ret.reportedCondition },
      );

      // ── Update asset condition + clear holder ─────────────────────────────
      await this.assetService['repo'].update(ret.allocation.assetId, {
        assignedToId: null,
        condition:    ret.reportedCondition as never,
      });

      // ── Append RETURNED event ─────────────────────────────────────────────
      await this.assetService['repo'].appendEvent({
        assetId:    ret.allocation.assetId,
        type:       AssetEventType.RETURNED,
        toStatus:   AssetStatus.AVAILABLE,
        fromStatus: AssetStatus.ALLOCATED,
        note:       input.note ?? 'Return approved',
        actorId,
        metadata:   { returnId: id, allocationId: ret.allocationId },
      });

      const updated = await this.repo.updateReturnStatus(id, ReturnStatus.COMPLETED, {
        processedById: actorId,
        decidedAt:     now,
      });

      eventBus.emit('audit.activity', {
        action: 'return.approved',
        entityType: 'Return',
        entityId: id,
        actorId,
        metadata: { allocationId: ret.allocationId },
      });

      return toReturnDto(updated);

    } else {
      // ── Reject: restore allocation ────────────────────────────────────────
      await this.repo.updateAllocationStatus(ret.allocationId, AllocationStatus.ACTIVE);

      const updated = await this.repo.updateReturnStatus(id, ReturnStatus.REJECTED, {
        processedById: actorId,
        decidedAt:     now,
      });

      eventBus.emit('audit.activity', {
        action: 'return.rejected',
        entityType: 'Return',
        entityId: id,
        actorId,
        metadata: { note: input.note },
      });

      return toReturnDto(updated);
    }
  }
}
