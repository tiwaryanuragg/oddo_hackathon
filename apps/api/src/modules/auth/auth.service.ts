import { Role, UserStatus } from '@assetflow/shared';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import { eventBus } from '../../core/events/index.js';
import { logger } from '../../core/logger.js';
import { env } from '../../config/env.js';
import type { AuthRepositoryContract } from './auth.repository.js';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';
import { mailService } from './mail.service.js';
import { toUserDto, type UserDto } from './auth.mapper.js';
import type { AuthTokens } from './auth.types.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
} from './auth.schema.js';

export interface RequestContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export interface SessionDto {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

/**
 * Auth use-cases. Pure orchestration — no HTTP, no Prisma. The repository is
 * injected (constructor) so the whole surface is unit-testable with a fake.
 */
export class AuthService {
  constructor(private readonly repo: AuthRepositoryContract) {}

  async signup(input: SignupInput, ctx: RequestContext): Promise<UserDto> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    const passwordHash = await passwordService.hash(input.password);
    const user = await this.repo.createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: Role.EMPLOYEE,
      status: UserStatus.PENDING, // requires admin activation before first login
    });

    eventBus.emit('user.registered', { userId: user.id, email: user.email, ip: ctx.ip });
    return toUserDto(user);
  }

  async login(input: LoginInput, ctx: RequestContext): Promise<{ user: UserDto; tokens: AuthTokens }> {
    const user = await this.repo.findUserByEmail(input.email);

    // Uniform failure for unknown email OR bad password (no user enumeration).
    if (!user || !(await passwordService.verify(input.password, user.passwordHash))) {
      throw new AppError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(403, ErrorCode.AUTH_ACCOUNT_INACTIVE, 'Your account is not active. Contact an administrator.');
    }

    const tokens = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role as Role, status: user.status as UserStatus },
      ctx,
    );

    await this.repo.updateLastLogin(user.id, new Date());
    eventBus.emit('user.logged_in', { userId: user.id, ip: ctx.ip, userAgent: ctx.userAgent });

    return { user: toUserDto(user), tokens };
  }

  /**
   * Rotate a refresh token: revoke the presented one and issue a fresh pair.
   * If a token that was ALREADY revoked is presented, we treat it as theft —
   * every session for that user is killed and the caller must log in again.
   */
  async refresh(rawToken: string | undefined, ctx: RequestContext): Promise<{ tokens: AuthTokens }> {
    if (!rawToken) {
      throw new AppError(401, ErrorCode.AUTH_TOKEN_INVALID, 'Missing refresh token');
    }

    const tokenHash = tokenService.hashRefreshToken(rawToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);
    const now = new Date();

    if (!stored) {
      throw new AppError(401, ErrorCode.AUTH_TOKEN_INVALID, 'Invalid refresh token');
    }

    if (stored.revokedAt) {
      // Reuse of a rotated token → likely stolen. Nuke the whole family.
      logger.warn({ userId: stored.userId }, 'Refresh token reuse detected — revoking all sessions');
      await this.repo.revokeAllUserRefreshTokens(stored.userId, now);
      throw new AppError(401, ErrorCode.AUTH_TOKEN_INVALID, 'Session expired. Please log in again.');
    }

    if (stored.expiresAt <= now) {
      throw new AppError(401, ErrorCode.AUTH_TOKEN_EXPIRED, 'Refresh token expired');
    }

    const user = await this.repo.findUserById(stored.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.repo.revokeRefreshToken(stored.id, now);
      throw new AppError(403, ErrorCode.AUTH_ACCOUNT_INACTIVE, 'Account is not active');
    }

    const tokens = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role as Role, status: user.status as UserStatus },
      ctx,
    );

    // Link old → new for the rotation chain, then revoke the old.
    const newHash = tokenService.hashRefreshToken(tokens.refreshToken);
    const newRecord = await this.repo.findRefreshTokenByHash(newHash);
    await this.repo.revokeRefreshToken(stored.id, now, newRecord?.id);

    return { tokens };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return; // idempotent
    const stored = await this.repo.findRefreshTokenByHash(tokenService.hashRefreshToken(rawToken));
    if (stored && !stored.revokedAt) {
      await this.repo.revokeRefreshToken(stored.id, new Date());
    }
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.repo.findUserByEmail(input.email);
    // Always return success to the caller; only act if the user exists.
    if (user) {
      const { raw, hash } = tokenService.generateResetToken();
      await this.repo.createResetToken(user.id, hash, tokenService.resetTokenExpiryDate());
      const resetUrl = `${env.WEB_APP_URL}/reset-password?token=${raw}`;
      await mailService.sendPasswordResetEmail(user.email, resetUrl);
      eventBus.emit('auth.password_reset_requested', { userId: user.id, email: user.email });
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = tokenService.hashRefreshToken(input.token);
    const record = await this.repo.findResetTokenByHash(tokenHash);
    const now = new Date();

    if (!record || record.usedAt || record.expiresAt <= now) {
      throw new AppError(400, ErrorCode.AUTH_TOKEN_INVALID, 'This reset link is invalid or has expired');
    }

    const passwordHash = await passwordService.hash(input.password);
    await this.repo.updatePassword(record.userId, passwordHash);
    await this.repo.consumeResetToken(record.id, now);
    // Changing a password invalidates every existing session.
    await this.repo.revokeAllUserRefreshTokens(record.userId, now);

    eventBus.emit('auth.password_changed', { userId: record.userId });
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw AppError.notFound('User not found');
    return toUserDto(user);
  }

  async listSessions(userId: string): Promise<SessionDto[]> {
    const tokens = await this.repo.listActiveRefreshTokens(userId, new Date());
    return tokens.map((t) => ({
      id: t.id,
      ipAddress: t.ipAddress,
      userAgent: t.userAgent,
      createdAt: t.createdAt.toISOString(),
      expiresAt: t.expiresAt.toISOString(),
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const token = await this.repo.findRefreshTokenById(sessionId);
    if (!token || token.userId !== userId) {
      throw AppError.notFound('Session not found');
    }
    if (!token.revokedAt) {
      await this.repo.revokeRefreshToken(sessionId, new Date());
    }
  }

  /** Sign an access token and persist a fresh refresh token. */
  private async issueTokens(
    subject: { id: string; email: string; role: Role; status: UserStatus },
    ctx: RequestContext,
  ): Promise<AuthTokens> {
    const accessToken = tokenService.signAccessToken(subject);
    const refreshToken = tokenService.generateRefreshToken();
    const refreshExpiresAt = tokenService.refreshExpiryDate();

    await this.repo.createRefreshToken({
      userId: subject.id,
      tokenHash: tokenService.hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ip,
    });

    return { accessToken, refreshToken, refreshExpiresAt };
  }
}
