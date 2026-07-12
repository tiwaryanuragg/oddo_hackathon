import type { AuthUser } from '../modules/auth/auth.types.js';

// Augment Express's Request so `req.user` is typed everywhere after
// `authenticate` runs. Ambient declaration — no runtime effect.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
