import { Prisma, type PrismaClient } from '@prisma/client';
import type { AssetCondition, AssetStatus } from '@assetflow/shared';
import type { AssetQuery } from './asset.schema.js';

// ─── Prisma includes ──────────────────────────────────────────────────────────

const assetInclude = {
  category: true,
  department: true,
  assignedTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      jobTitle: true,
    },
  },
  registeredBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  _count: {
    select: { events: true, allocations: true, maintenanceRequests: true },
  },
} satisfies Prisma.AssetInclude;

export type AssetFull = Prisma.AssetGetPayload<{ include: typeof assetInclude }>;

const eventInclude = {
  actor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.AssetEventInclude;

export type AssetEventFull = Prisma.AssetEventGetPayload<{ include: typeof eventInclude }>;

// ─── Write types ─────────────────────────────────────────────────────────────

export interface AssetCreateData {
  assetTag: string;
  name: string;
  description?: string | null;
  categoryId: string;
  departmentId?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  location?: string | null;
  condition?: AssetCondition;
  status?: AssetStatus;
  purchaseDate?: Date | null;
  purchaseCost?: number | null;
  currentValue?: number | null;
  warrantyExpiry?: Date | null;
  qrCodeUrl?: string | null;
  registeredById: string;
}

export interface AssetUpdateData {
  name?: string;
  description?: string | null;
  categoryId?: string;
  departmentId?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  location?: string | null;
  condition?: AssetCondition;
  purchaseDate?: Date | null;
  purchaseCost?: number | null;
  currentValue?: number | null;
  warrantyExpiry?: Date | null;
  assignedToId?: string | null;
}

export interface AppendEventData {
  assetId: string;
  type: string;
  fromStatus?: AssetStatus | null;
  toStatus?: AssetStatus | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export interface AssetRepositoryContract {
  findMany(query: AssetQuery): Promise<{ items: AssetFull[]; total: number }>;
  findById(id: string): Promise<AssetFull | null>;
  findByAssetTag(tag: string): Promise<AssetFull | null>;
  serialExists(serialNumber: string, excludeId?: string): Promise<boolean>;
  nextAssetTag(year: number): Promise<string>;
  create(data: AssetCreateData): Promise<AssetFull>;
  update(id: string, data: AssetUpdateData): Promise<AssetFull>;
  updateStatus(id: string, status: AssetStatus): Promise<AssetFull>;
  appendEvent(data: AppendEventData): Promise<AssetEventFull>;
  getEvents(assetId: string): Promise<AssetEventFull[]>;
  delete(id: string): Promise<void>;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class AssetRepository implements AssetRepositoryContract {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(query: AssetQuery): Promise<{ items: AssetFull[]; total: number }> {
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: assetInclude,
        orderBy,
        skip,
        take: query.limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<AssetFull | null> {
    return this.prisma.asset.findUnique({ where: { id }, include: assetInclude });
  }

  findByAssetTag(tag: string): Promise<AssetFull | null> {
    return this.prisma.asset.findUnique({ where: { assetTag: tag }, include: assetInclude });
  }

  async serialExists(serialNumber: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.asset.count({
      where: { serialNumber, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    return count > 0;
  }

  /**
   * Atomically reserves the next asset tag for the given year.
   * Uses a serializable transaction + count query to avoid races.
   * Format: AST-YYYY-NNNN (zero-padded to 4 digits, growing as needed).
   */
  async nextAssetTag(year: number): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const prefix = `AST-${year}-`;
      const count = await tx.asset.count({
        where: { assetTag: { startsWith: prefix } },
      });
      const seq = count + 1;
      const padded = String(seq).padStart(4, '0');
      return `${prefix}${padded}`;
    });
  }

  async create(data: AssetCreateData): Promise<AssetFull> {
    return this.prisma.asset.create({
      data: {
        assetTag: data.assetTag,
        name: data.name,
        description: data.description ?? null,
        categoryId: data.categoryId,
        departmentId: data.departmentId ?? null,
        serialNumber: data.serialNumber ?? null,
        manufacturer: data.manufacturer ?? null,
        model: data.model ?? null,
        location: data.location ?? null,
        condition: data.condition ?? 'NEW',
        status: data.status ?? 'DRAFT',
        purchaseDate: data.purchaseDate ?? null,
        purchaseCost: data.purchaseCost ?? null,
        currentValue: data.currentValue ?? null,
        warrantyExpiry: data.warrantyExpiry ?? null,
        qrCodeUrl: data.qrCodeUrl ?? null,
        registeredById: data.registeredById,
      },
      include: assetInclude,
    });
  }

  async update(id: string, data: AssetUpdateData): Promise<AssetFull> {
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...data,
        purchaseCost: data.purchaseCost ?? undefined,
        currentValue: data.currentValue ?? undefined,
      },
      include: assetInclude,
    });
  }

  async updateStatus(id: string, status: AssetStatus): Promise<AssetFull> {
    return this.prisma.asset.update({ where: { id }, data: { status }, include: assetInclude });
  }

  async appendEvent(data: AppendEventData): Promise<AssetEventFull> {
    return this.prisma.assetEvent.create({
      data: {
        assetId: data.assetId,
        type: data.type as never, // mapped to enum by Prisma
        fromStatus: (data.fromStatus ?? null) as never,
        toStatus: (data.toStatus ?? null) as never,
        note: data.note ?? null,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        actorId: data.actorId ?? null,
      },
      include: eventInclude,
    });
  }

  async getEvents(assetId: string): Promise<AssetEventFull[]> {
    return this.prisma.assetEvent.findMany({
      where: { assetId },
      include: eventInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.asset.delete({ where: { id } });
  }

  // ─── Private query builders ─────────────────────────────────────────────────

  private buildWhere(query: AssetQuery): Prisma.AssetWhereInput {
    const conditions: Prisma.AssetWhereInput[] = [];

    if (query.search) {
      const term = query.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { assetTag: { contains: term, mode: 'insensitive' } },
          { serialNumber: { contains: term, mode: 'insensitive' } },
          { manufacturer: { contains: term, mode: 'insensitive' } },
          { model: { contains: term, mode: 'insensitive' } },
          { location: { contains: term, mode: 'insensitive' } },
        ],
      });
    }

    if (query.status?.length) {
      conditions.push({ status: { in: query.status as AssetStatus[] } });
    }

    if (query.condition?.length) {
      conditions.push({ condition: { in: query.condition as AssetCondition[] } });
    }

    if (query.categoryId) conditions.push({ categoryId: query.categoryId });
    if (query.departmentId) conditions.push({ departmentId: query.departmentId });
    if (query.assignedToId) conditions.push({ assignedToId: query.assignedToId });

    if (query.purchasedAfter || query.purchasedBefore) {
      conditions.push({
        purchaseDate: {
          ...(query.purchasedAfter ? { gte: query.purchasedAfter } : {}),
          ...(query.purchasedBefore ? { lte: query.purchasedBefore } : {}),
        },
      });
    }

    return conditions.length ? { AND: conditions } : {};
  }

  private buildOrderBy(query: AssetQuery): Prisma.AssetOrderByWithRelationInput {
    const dir = query.sortDir;
    switch (query.sortBy) {
      case 'name':
        return { name: dir };
      case 'assetTag':
        return { assetTag: dir };
      case 'status':
        return { status: dir };
      case 'condition':
        return { condition: dir };
      case 'purchaseDate':
        return { purchaseDate: dir };
      case 'currentValue':
        return { currentValue: dir };
      default:
        return { createdAt: dir };
    }
  }
}
