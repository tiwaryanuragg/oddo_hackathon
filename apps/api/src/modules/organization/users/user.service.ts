import { ROLE_RANK, Role, UserStatus, type Paginated } from '@assetflow/shared';
import { AppError } from '../../../core/errors/app-error.js';
import { paginate } from '../../../core/http/response.js';
import { resolveSortBy, toSkipTake } from '../../../core/http/pagination.js';
import { eventBus } from '../../../core/events/index.js';
import { toUserDto, type UserDto } from '../../auth/auth.mapper.js';
import type { UserRepositoryContract } from './user.repository.js';
import type { PromoteUserInput, UpdateUserInput, UserListQuery } from './user.schema.js';

/** Who is performing the action (from `req.user`). */
export interface Actor {
  id: string;
  role: Role;
}

/** Allowed user-account status transitions (mirrors docs/06 §6.8). */
const STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  [UserStatus.PENDING]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
  [UserStatus.ACTIVE]: [UserStatus.SUSPENDED, UserStatus.DEACTIVATED],
  [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
  [UserStatus.DEACTIVATED]: [],
};

export class UserService {
  constructor(private readonly repo: UserRepositoryContract) {}

  async list(query: UserListQuery): Promise<Paginated<UserDto>> {
    const { skip, take } = toSkipTake(query);
    const sortBy = resolveSortBy(
      query.sortBy,
      ['firstName', 'lastName', 'email', 'createdAt', 'lastLoginAt'] as const,
      'createdAt',
    );
    const [items, total] = await this.repo.list({
      skip,
      take,
      sortBy,
      sortOrder: query.sortOrder,
      search: query.search,
      role: query.role,
      status: query.status,
      departmentId: query.departmentId,
    });
    return paginate(items.map(toUserDto), total, query.page, query.limit);
  }

  async getById(id: string): Promise<UserDto> {
    const user = await this.repo.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return toUserDto(user);
  }

  async update(id: string, input: UpdateUserInput, actor: Actor): Promise<UserDto> {
    const target = await this.repo.findById(id);
    if (!target) throw AppError.notFound('User not found');

    const isSelf = target.id === actor.id;

    // Cannot manage someone who outranks or equals you (unless it's yourself).
    if (!isSelf && ROLE_RANK[target.role as Role] >= ROLE_RANK[actor.role]) {
      throw AppError.forbidden('You cannot manage a user with an equal or higher role');
    }

    if (input.status && input.status !== target.status) {
      if (isSelf) {
        throw AppError.forbidden('You cannot change your own account status');
      }
      this.assertStatusTransition(target.status as UserStatus, input.status);
    }

    if (input.departmentId && !(await this.repo.departmentExists(input.departmentId))) {
      throw AppError.badRequest('The specified department does not exist', {
        departmentId: ['Not found'],
      });
    }

    const updated = await this.repo.update(id, input);
    eventBus.emit('audit.activity', {
      action: 'user.updated',
      entityType: 'User',
      entityId: id,
      actorId: actor.id,
    });
    return toUserDto(updated);
  }

  async promote(targetId: string, input: PromoteUserInput, actor: Actor): Promise<UserDto> {
    const target = await this.repo.findById(targetId);
    if (!target) throw AppError.notFound('User not found');

    const fromRole = target.role as Role;
    const toRole = input.role;
    const actorRank = ROLE_RANK[actor.role];

    if (target.id === actor.id) {
      throw AppError.forbidden('You cannot change your own role');
    }
    if (ROLE_RANK[fromRole] >= actorRank) {
      throw AppError.forbidden('You cannot change the role of a user at or above your own level');
    }
    if (ROLE_RANK[toRole] >= actorRank) {
      throw AppError.forbidden('You cannot assign a role at or above your own level');
    }
    if (toRole === fromRole) {
      throw AppError.badRequest('User already has this role');
    }

    // Last-admin guard: block demoting the final active admin.
    const isDemotionFromAdmin =
      (fromRole === Role.ADMIN || fromRole === Role.SUPER_ADMIN) && ROLE_RANK[toRole] < ROLE_RANK[fromRole];
    if (isDemotionFromAdmin && (await this.repo.countActiveAdmins()) <= 1) {
      throw AppError.conflict('Cannot demote the last remaining administrator');
    }

    const updated = await this.repo.promote({
      userId: targetId,
      actorId: actor.id,
      fromRole,
      toRole,
      reason: input.reason,
    });

    eventBus.emit('user.role_changed', { userId: targetId, actorId: actor.id, fromRole, toRole });
    return toUserDto(updated);
  }

  private assertStatusTransition(from: UserStatus, to: UserStatus): void {
    if (!STATUS_TRANSITIONS[from].includes(to)) {
      throw AppError.invalidTransition(`Cannot change account status from ${from} to ${to}`);
    }
  }
}
