import type { Paginated } from '@assetflow/shared';
import { AppError } from '../../../core/errors/app-error.js';
import { paginate } from '../../../core/http/response.js';
import { resolveSortBy, toSkipTake } from '../../../core/http/pagination.js';
import { eventBus } from '../../../core/events/index.js';
import type { DepartmentRepositoryContract } from './department.repository.js';
import { toDepartmentDto, type DepartmentDto } from './department.mapper.js';
import type {
  CreateDepartmentInput,
  DepartmentListQuery,
  UpdateDepartmentInput,
} from './department.schema.js';

export class DepartmentService {
  constructor(private readonly repo: DepartmentRepositoryContract) {}

  async list(query: DepartmentListQuery): Promise<Paginated<DepartmentDto>> {
    const { skip, take } = toSkipTake(query);
    const sortBy = resolveSortBy(query.sortBy, ['name', 'code', 'createdAt'] as const, 'createdAt');
    const [items, total] = await this.repo.list({
      skip,
      take,
      search: query.search,
      sortBy,
      sortOrder: query.sortOrder,
    });
    return paginate(items.map(toDepartmentDto), total, query.page, query.limit);
  }

  async getById(id: string): Promise<DepartmentDto> {
    const dept = await this.repo.findById(id);
    if (!dept) throw AppError.notFound('Department not found');
    return toDepartmentDto(dept);
  }

  async create(input: CreateDepartmentInput, actorId: string): Promise<DepartmentDto> {
    await this.assertManagerExists(input.managerId);
    const dept = await this.repo.create(input);
    eventBus.emit('audit.activity', {
      action: 'department.created',
      entityType: 'Department',
      entityId: dept.id,
      actorId,
      metadata: { name: dept.name, code: dept.code },
    });
    return toDepartmentDto(dept);
  }

  async update(id: string, input: UpdateDepartmentInput, actorId: string): Promise<DepartmentDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound('Department not found');
    if (input.managerId) await this.assertManagerExists(input.managerId);

    const dept = await this.repo.update(id, input);
    eventBus.emit('audit.activity', {
      action: 'department.updated',
      entityType: 'Department',
      entityId: dept.id,
      actorId,
    });
    return toDepartmentDto(dept);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const dept = await this.repo.findById(id);
    if (!dept) throw AppError.notFound('Department not found');
    if (dept._count.members > 0 || dept._count.assets > 0) {
      throw AppError.conflict(
        'Cannot delete a department that still has members or assets. Reassign them first.',
      );
    }
    await this.repo.delete(id);
    eventBus.emit('audit.activity', {
      action: 'department.deleted',
      entityType: 'Department',
      entityId: id,
      actorId,
    });
  }

  private async assertManagerExists(managerId: string | null | undefined): Promise<void> {
    if (managerId && !(await this.repo.userExists(managerId))) {
      throw AppError.badRequest('The specified manager does not exist', {
        managerId: ['User not found'],
      });
    }
  }
}
