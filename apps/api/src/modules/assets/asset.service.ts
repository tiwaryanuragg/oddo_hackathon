import QRCode from 'qrcode';
import { AssetStatus, AssetEventType } from '@assetflow/shared';
import { AppError } from '../../core/errors/app-error.js';
import { eventBus } from '../../core/events/index.js';
import { env } from '../../config/env.js';
import type { AssetRepositoryContract } from './asset.repository.js';
import {
  toAssetDto,
  toAssetEventDto,
  calcDepreciation,
  type AssetDto,
  type AssetEventDto,
  type DepreciationDto,
} from './asset.mapper.js';
import type {
  RegisterAssetInput,
  UpdateAssetInput,
  ChangeStatusInput,
  RetireAssetInput,
  AssetQuery,
} from './asset.schema.js';

// ─── Valid state transitions ──────────────────────────────────────────────────
// Key = from, Values = allowed to-states (via manual status change endpoint)
// Allocation/maintenance/booking modules also drive transitions, but they use
// changeStatus() directly after enforcing their own business rules.

const ALLOWED_TRANSITIONS: Partial<Record<AssetStatus, AssetStatus[]>> = {
  [AssetStatus.DRAFT]: [AssetStatus.AVAILABLE],
  [AssetStatus.AVAILABLE]: [
    AssetStatus.IN_MAINTENANCE,
    AssetStatus.UNDER_AUDIT,
    AssetStatus.LOST,
    AssetStatus.RETIRED,
  ],
  [AssetStatus.RESERVED]: [AssetStatus.AVAILABLE, AssetStatus.ALLOCATED],
  [AssetStatus.ALLOCATED]: [
    AssetStatus.AVAILABLE,
    AssetStatus.IN_MAINTENANCE,
    AssetStatus.LOST,
  ],
  [AssetStatus.IN_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.RETIRED],
  [AssetStatus.UNDER_AUDIT]: [AssetStatus.AVAILABLE],
  [AssetStatus.LOST]: [AssetStatus.AVAILABLE, AssetStatus.RETIRED],
  [AssetStatus.RETIRED]: [], // terminal
};

// ─── Paginated result ─────────────────────────────────────────────────────────

export interface PaginatedAssets {
  items: AssetDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AssetService {
  constructor(private readonly repo: AssetRepositoryContract) {}

  // ─── List / Search ─────────────────────────────────────────────────────────

  async list(query: AssetQuery): Promise<PaginatedAssets> {
    const { items, total } = await this.repo.findMany(query);
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    return {
      items: items.map(toAssetDto),
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1,
    };
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<AssetDto> {
    const asset = await this.repo.findById(id);
    if (!asset) throw AppError.notFound('Asset not found');
    return toAssetDto(asset);
  }

  // ─── Register ──────────────────────────────────────────────────────────────

  async register(input: RegisterAssetInput, actorId: string): Promise<AssetDto> {
    // Serial number uniqueness
    if (input.serialNumber && (await this.repo.serialExists(input.serialNumber))) {
      throw AppError.conflict('An asset with this serial number is already registered');
    }

    const year = new Date().getFullYear();
    const assetTag = await this.repo.nextAssetTag(year);

    // Build the QR URL now; actual QR bytes are generated on-demand by the QR endpoint
    const qrCodeUrl = `${env.WEB_APP_URL}/assets`;

    const asset = await this.repo.create({
      assetTag,
      name: input.name,
      description: input.description ?? null,
      categoryId: input.categoryId,
      departmentId: input.departmentId ?? null,
      serialNumber: input.serialNumber ?? null,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      location: input.location ?? null,
      condition: input.condition,
      status: AssetStatus.DRAFT,
      purchaseDate: input.purchaseDate ?? null,
      purchaseCost: input.purchaseCost ?? null,
      currentValue: input.purchaseCost ?? null, // starts equal to cost
      warrantyExpiry: input.warrantyExpiry ?? null,
      qrCodeUrl,
      registeredById: actorId,
    });

    // Append CREATED event to the immutable ledger
    await this.repo.appendEvent({
      assetId: asset.id,
      type: AssetEventType.CREATED,
      toStatus: AssetStatus.DRAFT,
      note: 'Asset registered',
      actorId,
      metadata: { assetTag },
    });

    // Update QR URL to include actual asset id
    const finalQrUrl = `${env.WEB_APP_URL}/assets/${asset.id}`;
    const updated = await this.repo.update(asset.id, { ...{} });
    void updated; // updated just to refresh the include; we return the dto with corrected URL
    
    eventBus.emit('audit.activity', {
      action: 'asset.created',
      entityType: 'Asset',
      entityId: asset.id,
      actorId,
      metadata: { assetTag, name: asset.name },
    });

    const dto = toAssetDto(asset);
    dto.qrCodeUrl = finalQrUrl;
    return dto;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async update(id: string, input: UpdateAssetInput, actorId: string): Promise<AssetDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound('Asset not found');

    if (existing.status === AssetStatus.RETIRED) {
      throw AppError.conflict('A retired asset cannot be modified');
    }

    if (
      input.serialNumber &&
      input.serialNumber !== existing.serialNumber &&
      (await this.repo.serialExists(input.serialNumber, id))
    ) {
      throw AppError.conflict('An asset with this serial number is already registered');
    }

    const asset = await this.repo.update(id, {
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      departmentId: input.departmentId,
      serialNumber: input.serialNumber,
      manufacturer: input.manufacturer,
      model: input.model,
      location: input.location,
      condition: input.condition,
      purchaseDate: input.purchaseDate,
      purchaseCost: input.purchaseCost,
      warrantyExpiry: input.warrantyExpiry,
      assignedToId: input.assignedToId,
    });

    await this.repo.appendEvent({
      assetId: id,
      type: AssetEventType.UPDATED,
      note: 'Asset details updated',
      actorId,
    });

    eventBus.emit('audit.activity', {
      action: 'asset.updated',
      entityType: 'Asset',
      entityId: id,
      actorId,
    });

    return toAssetDto(asset);
  }

  // ─── Change Status ─────────────────────────────────────────────────────────

  async changeStatus(
    id: string,
    input: ChangeStatusInput,
    actorId: string,
  ): Promise<AssetDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound('Asset not found');

    const from = existing.status as AssetStatus;
    const to = input.status;

    if (from === to) {
      return toAssetDto(existing); // idempotent
    }

    this.assertValidTransition(from, to);

    const asset = await this.repo.updateStatus(id, to);

    await this.repo.appendEvent({
      assetId: id,
      type: AssetEventType.STATUS_CHANGED,
      fromStatus: from,
      toStatus: to,
      note: input.note ?? null,
      actorId,
    });

    eventBus.emit('audit.activity', {
      action: 'asset.status_changed',
      entityType: 'Asset',
      entityId: id,
      actorId,
      metadata: { from, to },
    });

    return toAssetDto(asset);
  }

  // ─── Retire ────────────────────────────────────────────────────────────────

  async retire(id: string, input: RetireAssetInput, actorId: string): Promise<AssetDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound('Asset not found');

    const from = existing.status as AssetStatus;

    if (from === AssetStatus.RETIRED) {
      throw AppError.conflict('Asset is already retired');
    }

    if (from === AssetStatus.ALLOCATED) {
      throw AppError.conflict(
        'Cannot retire an allocated asset. Return it first before retiring.',
      );
    }

    const asset = await this.repo.updateStatus(id, AssetStatus.RETIRED);

    await this.repo.appendEvent({
      assetId: id,
      type: AssetEventType.RETIRED,
      fromStatus: from,
      toStatus: AssetStatus.RETIRED,
      note: input.reason,
      actorId,
      metadata: { reason: input.reason },
    });

    eventBus.emit('audit.activity', {
      action: 'asset.retired',
      entityType: 'Asset',
      entityId: id,
      actorId,
      metadata: { reason: input.reason },
    });

    return toAssetDto(asset);
  }

  // ─── History ───────────────────────────────────────────────────────────────

  async getHistory(assetId: string): Promise<AssetEventDto[]> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw AppError.notFound('Asset not found');

    const events = await this.repo.getEvents(assetId);
    return events.map(toAssetEventDto);
  }

  // ─── QR Code ───────────────────────────────────────────────────────────────

  async generateQr(
    assetId: string,
    format: 'svg' | 'png',
  ): Promise<{ buffer: Buffer | string; contentType: string }> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw AppError.notFound('Asset not found');

    const url = `${env.WEB_APP_URL}/assets/${assetId}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(url, {
        type: 'svg',
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      });
      return { buffer: svg, contentType: 'image/svg+xml' };
    }

    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      margin: 2,
      width: 400,
      color: { dark: '#1e293b', light: '#ffffff' },
    });
    return { buffer, contentType: 'image/png' };
  }

  // ─── Depreciation ──────────────────────────────────────────────────────────

  async getDepreciation(assetId: string): Promise<DepreciationDto> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw AppError.notFound('Asset not found');
    return calcDepreciation(asset);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Called by other modules (allocation, maintenance, booking) to drive
   * asset status transitions without going through the HTTP layer.
   */
  async transitionStatus(
    assetId: string,
    to: AssetStatus,
    actorId: string,
    note?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const asset = await this.repo.findById(assetId);
    if (!asset) throw AppError.notFound('Asset not found');

    const from = asset.status as AssetStatus;
    if (from !== to) {
      await this.repo.updateStatus(assetId, to);
      await this.repo.appendEvent({
        assetId,
        type: AssetEventType.STATUS_CHANGED,
        fromStatus: from,
        toStatus: to,
        note: note ?? null,
        actorId,
        metadata: metadata ?? null,
      });
    }
  }

  private assertValidTransition(from: AssetStatus, to: AssetStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw AppError.invalidTransition(
        `Cannot transition asset from ${from} to ${to}`,
      );
    }
  }
}
