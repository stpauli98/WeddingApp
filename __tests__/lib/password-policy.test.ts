import { validatePassword } from '@/lib/security/password-policy';

describe('validatePassword', () => {
  it('rejects non-string', () => expect(validatePassword(123)).toBe('too_short'));
  it('rejects < 10 chars', () => expect(validatePassword('Abc123!')).toBe('too_short'));
  it('rejects > 72 chars', () => expect(validatePassword('A1'.repeat(40))).toBe('too_long'));
  it('rejects single-class (lowercase only)', () => expect(validatePassword('aaaaaaaaaa')).toBe('weak'));
  it('accepts 2 classes (lower+digit)', () => expect(validatePassword('password10')).toBeNull());
  it('accepts 4 classes', () => expect(validatePassword('Passw0rd!!')).toBeNull());
});
