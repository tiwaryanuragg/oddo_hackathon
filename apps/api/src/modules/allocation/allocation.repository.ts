import { Prisma, type PrismaClient } from '@prisma/client';
import type { AllocationStatus, TransferStatus, ReturnStatus, AssetCondition } from '@assetflow/shared';
import type { AllocationQuery, TransferQuery, ReturnQuery } from './allocation.schema.js';

// ─── Prisma include shapes ────────────────────────────────────────────────────

const userRef = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    avatarUrl: true,
    jobTitle: true,
    departmentId: true,
  },
} as const;

const assetRef = {
  select: {
    id: true,
    assetTag: true,
    name: true,
    status: true,
    condition: true,
    location: true,
    category: { select: { id: true, name: true } },
    department: { select: { id: true, name: true, code: true } },
  },
} as const;

const allocationInclude = {
  asset:    assetRef,
  holder:   userRef,
  issuedBy: userRef,
  returns: {
    include: {
      submittedBy: userRef,
      processedBy: userRef,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  transferRequests: {
    where: { status: 'PENDING' as TransferStatus },
    include: {
      fromUser: userRef,
      toUser:   userRef,
    },
    take: 1,
  },
} satisfies Prisma.AllocationInclude;

export type AllocationFull = Prisma.AllocationGetPayload<{ include: typeof allocationInclude }>;

const transferInclude = {
  asset:       assetRef,
  allocation:  { select: { id: true, status: true, allocatedAt: true } },
  fromUser:    userRef,
  toUser:      userRef,
  requestedBy: userRef,
  approver:    userRef,
} satisfies Prisma.TransferRequestInclude;

export type TransferFull = Prisma.TransferRequestGetPayload<{ include: typeof transferInclude }>;

const returnInclude = {
  allocation: {
    include: {
      asset:   assetRef,
      holder:  userRef,
    },
  },
  submittedBy: userRef,
  processedBy: userRef,
} satisfies Prisma.ReturnInclude;

export type ReturnFull = Prisma.ReturnGetPayload<{ include: typeof returnInclude }>;

// ─── Write types ──────────────────────────────────────────────────────────────

export interface CreateAllocationData {
  assetId:   string;
  holderId:  string;
  issuedById: string;
  dueDate?:  Date | null;
  note?:     string | null;
}

export interface CreateTransferData {
  assetId:       string;
  allocationId?: string;
  fromUserId:    string;
  toUserId:      string;
  requestedById: string;
  reason?:       string | null;
}

export interface CreateReturnData {
  allocationId:      string;
  submittedById:     string;
  reportedCondition: AssetCondition;
  note?:             string | null;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export interface AllocationRepositoryContract {
  // Allocations
  findAllocations(query: AllocationQuery): Promise<{ items: AllocationFull[]; total: number }>;
  findAllocationById(id: string): Promise<AllocationFull | null>;
  findActiveAllocationForAsset(assetId: string): Promise<AllocationFull | null>;
  createAllocation(data: CreateAllocationData): Promise<AllocationFull>;
  updateAllocationStatus(id: string, status: AllocationStatus, returnedAt?: Date): Promise<AllocationFull>;

  // Transfers
  findTransfers(query: TransferQuery): Promise<{ items: TransferFull[]; total: number }>;
  findTransferById(id: string): Promise<TransferFull | null>;
  findPendingTransferForAsset(assetId: string): Promise<TransferFull | null>;
  createTransfer(data: CreateTransferData): Promise<TransferFull>;
  updateTransferStatus(
    id: string,
    status: TransferStatus,
    patch?: { approverId?: string; decisionNote?: string; decidedAt?: Date },
  ): Promise<TransferFull>;

  // Returns
  findReturns(query: ReturnQuery): Promise<{ items: ReturnFull[]; total: number }>;
  findReturnById(id: string): Promise<ReturnFull | null>;
  findPendingReturnForAllocation(allocationId: string): Promise<ReturnFull | null>;
  createReturn(data: CreateReturnData): Promise<ReturnFull>;
  updateReturnStatus(
    id: string,
    status: ReturnStatus,
    patch?: { processedById?: string; decidedAt?: Date },
  ): Promise<ReturnFull>;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class AllocationRepository implements AllocationRepositoryContract {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Allocations ──────────────────────────────────────────────────────────────

  async findAllocations(query: AllocationQuery): Promise<{ items: AllocationFull[]; total: number }> {
    const where: Prisma.AllocationWhereInput = {
      ...(query.status   ? { status:   query.status }   : {}),
      ...(query.holderId ? { holderId: query.holderId } : {}),
      ...(query.assetId  ? { assetId:  query.assetId }  : {}),
    };

    const orderBy: Prisma.AllocationOrderByWithRelationInput =
      query.sortBy === 'dueDate'      ? { dueDate: query.sortDir } :
      query.sortBy === 'createdAt'    ? { createdAt: query.sortDir } :
                                        { allocatedAt: query.sortDir };

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.allocation.findMany({ where, include: allocationInclude, orderBy, skip, take: query.limit }),
      this.prisma.allocation.count({ where }),
    ]);
    return { items, total };
  }

  findAllocationById(id: string): Promise<AllocationFull | null> {
    return this.prisma.allocation.findUnique({ where: { id }, include: allocationInclude });
  }

  findActiveAllocationForAsset(assetId: string): Promise<AllocationFull | null> {
    return this.prisma.allocation.findFirst({
      where: { assetId, status: 'ACTIVE' },
      include: allocationInclude,
    });
  }

  createAllocation(data: CreateAllocationData): Promise<AllocationFull> {
    return this.prisma.allocation.create({
      data: {
        assetId:   data.assetId,
        holderId:  data.holderId,
        issuedById: data.issuedById,
        dueDate:   data.dueDate ?? null,
        note:      data.note ?? null,
        status:    'ACTIVE',
      },
      include: allocationInclude,
    });
  }

  updateAllocationStatus(id: string, status: AllocationStatus, returnedAt?: Date): Promise<AllocationFull> {
    return this.prisma.allocation.update({
      where: { id },
      data: {
        status,
        ...(returnedAt ? { returnedAt } : {}),
      },
      include: allocationInclude,
    });
  }

  // ── Transfers ────────────────────────────────────────────────────────────────

  async findTransfers(query: TransferQuery): Promise<{ items: TransferFull[]; total: number }> {
    const where: Prisma.TransferRequestWhereInput = {
      ...(query.status     ? { status:     query.status }     : {}),
      ...(query.assetId    ? { assetId:    query.assetId }    : {}),
      ...(query.fromUserId ? { fromUserId: query.fromUserId } : {}),
      ...(query.toUserId   ? { toUserId:   query.toUserId }   : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.transferRequest.findMany({
        where,
        include: transferInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.transferRequest.count({ where }),
    ]);
    return { items, total };
  }

  findTransferById(id: string): Promise<TransferFull | null> {
    return this.prisma.transferRequest.findUnique({ where: { id }, include: transferInclude });
  }

  findPendingTransferForAsset(assetId: string): Promise<TransferFull | null> {
    return this.prisma.transferRequest.findFirst({
      where: { assetId, status: 'PENDING' },
      include: transferInclude,
    });
  }

  createTransfer(data: CreateTransferData): Promise<TransferFull> {
    return this.prisma.transferRequest.create({
      data: {
        assetId:       data.assetId,
        allocationId:  data.allocationId ?? null,
        fromUserId:    data.fromUserId,
        toUserId:      data.toUserId,
        requestedById: data.requestedById,
        reason:        data.reason ?? null,
        status:        'PENDING',
      },
      include: transferInclude,
    });
  }

  updateTransferStatus(
    id: string,
    status: TransferStatus,
    patch?: { approverId?: string; decisionNote?: string; decidedAt?: Date },
  ): Promise<TransferFull> {
    return this.prisma.transferRequest.update({
      where: { id },
      data: {
        status,
        approverId:   patch?.approverId ?? undefined,
        decisionNote: patch?.decisionNote ?? undefined,
        decidedAt:    patch?.decidedAt ?? undefined,
      },
      include: transferInclude,
    });
  }

  // ── Returns ──────────────────────────────────────────────────────────────────

  async findReturns(query: ReturnQuery): Promise<{ items: ReturnFull[]; total: number }> {
    const where: Prisma.ReturnWhereInput = {
      ...(query.status       ? { status:       query.status }       : {}),
      ...(query.allocationId ? { allocationId: query.allocationId } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.return.findMany({
        where,
        include: returnInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.return.count({ where }),
    ]);
    return { items, total };
  }

  findReturnById(id: string): Promise<ReturnFull | null> {
    return this.prisma.return.findUnique({ where: { id }, include: returnInclude });
  }

  findPendingReturnForAllocation(allocationId: string): Promise<ReturnFull | null> {
    return this.prisma.return.findFirst({
      where: { allocationId, status: { in: ['REQUESTED', 'APPROVED'] } },
      include: returnInclude,
    });
  }

  createReturn(data: CreateReturnData): Promise<ReturnFull> {
    return this.prisma.return.create({
      data: {
        allocationId:      data.allocationId,
        submittedById:     data.submittedById,
        reportedCondition: data.reportedCondition,
        note:              data.note ?? null,
        status:            'REQUESTED',
      },
      include: returnInclude,
    });
  }

  updateReturnStatus(
    id: string,
    status: ReturnStatus,
    patch?: { processedById?: string; decidedAt?: Date },
  ): Promise<ReturnFull> {
    return this.prisma.return.update({
      where: { id },
      data: {
        status,
        processedById: patch?.processedById ?? undefined,
        decidedAt:     patch?.decidedAt ?? undefined,
      },
      include: returnInclude,
    });
  }
}
