import type { Request, Response } from 'express';
import { created, noContent, ok } from '../../core/http/response.js';
import { REFRESH_COOKIE_NAME, clearRefreshCookieOptions, refreshCookieOptions } from '../../core/security/cookies.js';
import type { AuthService, RequestContext } from './auth.service.js';
import type { AuthTokens } from './auth.types.js';

function context(req: Request): RequestContext {
  return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
}

function setRefreshCookie(res: Response, tokens: AuthTokens): void {
  const maxAge = Math.max(0, tokens.refreshExpiresAt.getTime() - Date.now());
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions(maxAge));
}

/** HTTP glue. Extracts request data, calls the service, shapes the response and
 *  manages the refresh cookie. No business logic lives here. */
export class AuthController {
  constructor(private readonly service: AuthService) {}

  signup = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.signup(req.body, context(req));
    created(res, {
      user,
      message: 'Account created. An administrator must activate it before you can sign in.',
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { user, tokens } = await this.service.login(req.body, context(req));
    setRefreshCookie(res, tokens);
    ok(res, { user, accessToken: tokens.accessToken });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const { tokens } = await this.service.refresh(rawToken, context(req));
    setRefreshCookie(res, tokens);
    ok(res, { accessToken: tokens.accessToken });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.service.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
    noContent(res);
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    await this.service.forgotPassword(req.body);
    ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.service.resetPassword(req.body);
    ok(res, { message: 'Your password has been reset. Please sign in.' });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.getMe(req.user!.id);
    ok(res, user);
  };

  sessions = async (req: Request, res: Response): Promise<void> => {
    const sessions = await this.service.listSessions(req.user!.id);
    ok(res, sessions);
  };

  revokeSession = async (req: Request, res: Response): Promise<void> => {
    await this.service.revokeSession(req.user!.id, req.params.id!);
    noContent(res);
  };
}
