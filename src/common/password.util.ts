import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const BCRYPT_HASH = /^\$2[aby]\$/;
const SALT_ROUNDS = 12;

export function isBcryptHash(stored: string): boolean {
  return BCRYPT_HASH.test(stored);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  stored: string | undefined,
): Promise<boolean> {
  if (!stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  const legacy = createHash('sha256').update(plain).digest('hex');
  return legacy === stored;
}
