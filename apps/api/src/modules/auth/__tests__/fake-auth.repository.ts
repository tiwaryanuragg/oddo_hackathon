import type { RefreshToken, User } from '@prisma/client';
import { Role, UserStatus } from '@assetflow/shared';
import type {
  AuthRepositoryContract,
  CreateRefreshTokenData,
  CreateUserData,
} from '../auth.repository.js';

interface ResetRecord {
  id: string;
  userId: string;
  tokenHash: string;
  usedAt: Date | null;
  expiresAt: Date;
}

/** In-memory AuthRepository for unit tests — no database required. */
export class FakeAuthRepository implements AuthRepositoryContract {
  readonly users = new Map<string, User>();
  readonly refreshTokens = new Map<string, RefreshToken>();
  readonly resetTokens = new Map<string, ResetRecord>();
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  /** Test helper to seed a ready-to-login user. */
  seedUser(overrides: Partial<User> & { email: string; passwordHash: string }): User {
    const id = overrides.id ?? this.nextId('user');
    const user: User = {
      id,
      email: overrides.email,
      passwordHash: overrides.passwordHash,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      phone: overrides.phone ?? null,
      avatarUrl: overrides.avatarUrl ?? null,
      role: (overrides.role ?? Role.EMPLOYEE) as User['role'],
      status: (overrides.status ?? UserStatus.ACTIVE) as User['status'],
      departmentId: overrides.departmentId ?? null,
      jobTitle: overrides.jobTitle ?? null,
      lastLoginAt: overrides.lastLoginAt ?? null,
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: overrides.updatedAt ?? new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) if (u.email === email) return u;
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async createUser(data: CreateUserData): Promise<User> {
    return this.seedUser({
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: (data.role ?? Role.EMPLOYEE) as User['role'],
      status: (data.status ?? UserStatus.PENDING) as User['status'],
    });
  }

  async updateLastLogin(userId: string, at: Date): Promise<void> {
    const u = this.users.get(userId);
    if (u) u.lastLoginAt = at;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const u = this.users.get(userId);
    if (!u) throw new Error('user not found');
    u.passwordHash = passwordHash;
    return u;
  }

  async createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const id = this.nextId('rt');
    const token: RefreshToken = {
      id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      revokedAt: null,
      replacedById: null,
      userAgent: data.userAgent ?? null,
      ipAddress: data.ipAddress ?? null,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    this.refreshTokens.set(id, token);
    return token;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    for (const t of this.refreshTokens.values()) if (t.tokenHash === tokenHash) return t;
    return null;
  }

  async findRefreshTokenById(id: string): Promise<RefreshToken | null> {
    return this.refreshTokens.get(id) ?? null;
  }

  async revokeRefreshToken(id: string, at: Date, replacedById?: string): Promise<void> {
    const t = this.refreshTokens.get(id);
    if (t) {
      t.revokedAt = at;
      t.replacedById = replacedById ?? null;
    }
  }

  async revokeAllUserRefreshTokens(userId: string, at: Date): Promise<void> {
    for (const t of this.refreshTokens.values()) {
      if (t.userId === userId && !t.revokedAt) t.revokedAt = at;
    }
  }

  async listActiveRefreshTokens(userId: string, now: Date): Promise<RefreshToken[]> {
    return [...this.refreshTokens.values()].filter(
      (t) => t.userId === userId && !t.revokedAt && t.expiresAt > now,
    );
  }

  async createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const id = this.nextId('prt');
    this.resetTokens.set(id, { id, userId, tokenHash, usedAt: null, expiresAt });
  }

  async findResetTokenByHash(tokenHash: string) {
    for (const r of this.resetTokens.values()) {
      if (r.tokenHash === tokenHash) {
        return { id: r.id, userId: r.userId, usedAt: r.usedAt, expiresAt: r.expiresAt };
      }
    }
    return null;
  }

  async consumeResetToken(id: string, at: Date): Promise<void> {
    const r = this.resetTokens.get(id);
    if (r) r.usedAt = at;
  }
}
