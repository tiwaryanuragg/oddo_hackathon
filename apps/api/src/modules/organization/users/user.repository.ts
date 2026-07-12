import { Prisma, Role as PrismaRole, UserStatus as PrismaUserStatus, type PrismaClient, type User } from '@prisma/client';
import type { Role, UserStatus } from '@assetflow/shared';

export interface UserListArgs {
  skip: number;
  take: number;
  sortBy: 'firstName' | 'lastName' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder: 'asc' | 'desc';
  search?: string | undefined;
  role?: Role | undefined;
  status?: UserStatus | undefined;
  departmentId?: string | undefined;
}

export interface UserProfileUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
  departmentId?: string | null;
  status?: UserStatus;
}

export interface PromoteArgs {
  userId: string;
  actorId: string;
  fromRole: Role;
  toRole: Role;
  reason?: string | undefined;
}

export interface UserRepositoryContract {
  list(args: UserListArgs): Promise<[User[], number]>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: UserProfileUpdate): Promise<User>;
  promote(args: PromoteArgs): Promise<User>;
  countActiveAdmins(): Promise<number>;
  departmentExists(id: string): Promise<boolean>;
}

export class UserRepository implements UserRepositoryContract {
  constructor(private readonly prisma: PrismaClient) {}

  async list(args: UserListArgs): Promise<[User[], number]> {
    const where: Prisma.UserWhereInput = {
      ...(args.role ? { role: args.role as PrismaRole } : {}),
      ...(args.status ? { status: args.status as PrismaUserStatus } : {}),
      ...(args.departmentId ? { departmentId: args.departmentId } : {}),
      ...(args.search
        ? {
            OR: [
              { firstName: { contains: args.search, mode: 'insensitive' } },
              { lastName: { contains: args.search, mode: 'insensitive' } },
              { email: { contains: args.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { [args.sortBy]: args.sortOrder },
        skip: args.skip,
        take: args.take,
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: string, data: UserProfileUpdate): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(data.status ? { status: data.status as PrismaUserStatus } : {}),
      },
    });
  }

  /** Role change + audit log in one transaction. */
  promote(args: PromoteArgs): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: args.userId },
        data: { role: args.toRole as PrismaRole },
      });
      await tx.roleChangeLog.create({
        data: {
          userId: args.userId,
          changedById: args.actorId,
          fromRole: args.fromRole as PrismaRole,
          toRole: args.toRole as PrismaRole,
          reason: args.reason ?? null,
        },
      });
      return user;
    });
  }

  /** Count of active ADMIN/SUPER_ADMIN — powers the last-admin guard. */
  countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({
      where: {
        role: { in: [PrismaRole.ADMIN, PrismaRole.SUPER_ADMIN] },
        status: PrismaUserStatus.ACTIVE,
      },
    });
  }

  async departmentExists(id: string): Promise<boolean> {
    return (await this.prisma.department.count({ where: { id } })) > 0;
  }
}
