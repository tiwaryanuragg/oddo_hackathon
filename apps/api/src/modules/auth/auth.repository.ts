import type { PrismaClient, RefreshToken, User } from '@prisma/client';
import { Role, UserStatus } from '@assetflow/shared';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: Role;
  status?: UserStatus;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

/**
 * Data-access contract for the auth module. Services depend on this interface
 * (not the concrete Prisma implementation), so tests inject an in-memory fake —
 * dependency inversion in practice.
 */
export interface AuthRepositoryContract {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(data: CreateUserData): Promise<User>;
  updateLastLogin(userId: string, at: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<User>;

  createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null>;
  findRefreshTokenById(id: string): Promise<RefreshToken | null>;
  revokeRefreshToken(id: string, at: Date, replacedById?: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string, at: Date): Promise<void>;
  listActiveRefreshTokens(userId: string, now: Date): Promise<RefreshToken[]>;

  createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findResetTokenByHash(tokenHash: string): Promise<{ id: string; userId: string; usedAt: Date | null; expiresAt: Date } | null>;
  consumeResetToken(id: string, at: Date): Promise<void>;
}

/** Prisma-backed implementation. The ONLY place in the module that touches the DB. */
export class AuthRepository implements AuthRepositoryContract {
  constructor(private readonly prisma: PrismaClient) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? Role.EMPLOYEE,
        status: data.status ?? UserStatus.PENDING,
      },
    });
  }

  async updateLastLogin(userId: string, at: Date): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: at } });
  }

  updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
      },
    });
  }

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  findRefreshTokenById(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  async revokeRefreshToken(id: string, at: Date, replacedById?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: at, replacedById: replacedById ?? null },
    });
  }

  async revokeAllUserRefreshTokens(userId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  listActiveRefreshTokens(userId: string, now: Date): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  }

  findResetTokenByHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });
  }

  async consumeResetToken(id: string, at: Date): Promise<void> {
    await this.prisma.passwordResetToken.update({ where: { id }, data: { usedAt: at } });
  }
}
