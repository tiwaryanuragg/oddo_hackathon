import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

/** Password hashing. Isolated so the algorithm can be swapped in one place. */
export const passwordService = {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
  },

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  },
};
