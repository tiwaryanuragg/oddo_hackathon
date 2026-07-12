import type { User } from '@prisma/client';
import { Role, UserStatus } from '@assetflow/shared';
import type {
  PromoteArgs,
  UserListArgs,
  UserProfileUpdate,
  UserRepositoryContract,
} from '../user.repository.js';

export interface RoleChangeRecord {
  userId: string;
  changedById: string;
  fromRole: Role;
  toRole: Role;
  reason?: string | undefined;
}

/** In-memory UserRepository for unit tests. */
export class FakeUserRepository implements UserRepositoryContract {
  readonly users = new Map<string, User>();
  readonly roleChangeLogs: RoleChangeRecord[] = [];
  readonly departments = new Set<string>();
  private seq = 0;

  seedUser(overrides: Partial<User> & { id?: string }): User {
    const id = overrides.id ?? `user_${(this.seq += 1)}`;
    const user: User = {
      id,
      email: overrides.email ?? `${id}@corp.com`,
      passwordHash: 'x',
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      phone: null,
      avatarUrl: null,
      role: (overrides.role ?? Role.EMPLOYEE) as User['role'],
      status: (overrides.status ?? UserStatus.ACTIVE) as User['status'],
      departmentId: overrides.departmentId ?? null,
      jobTitle: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async list(args: UserListArgs): Promise<[User[], number]> {
    let items = [...this.users.values()];
    if (args.role) items = items.filter((u) => u.role === args.role);
    if (args.status) items = items.filter((u) => u.status === args.status);
    if (args.departmentId) items = items.filter((u) => u.departmentId === args.departmentId);
    const total = items.length;
    return [items.slice(args.skip, args.skip + args.take), total];
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async update(id: string, data: UserProfileUpdate): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('not found');
    Object.assign(user, data);
    return user;
  }

  async promote(args: PromoteArgs): Promise<User> {
    const user = this.users.get(args.userId);
    if (!user) throw new Error('not found');
    user.role = args.toRole as User['role'];
    this.roleChangeLogs.push({
      userId: args.userId,
      changedById: args.actorId,
      fromRole: args.fromRole,
      toRole: args.toRole,
      reason: args.reason,
    });
    return user;
  }

  async countActiveAdmins(): Promise<number> {
    return [...this.users.values()].filter(
      (u) => (u.role === Role.ADMIN || u.role === Role.SUPER_ADMIN) && u.status === UserStatus.ACTIVE,
    ).length;
  }

  async departmentExists(id: string): Promise<boolean> {
    return this.departments.has(id);
  }
}
