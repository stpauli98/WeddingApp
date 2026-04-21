export type PasswordError = 'too_short' | 'too_long' | 'weak';

export function validatePassword(pw: unknown): PasswordError | null {
  if (typeof pw !== 'string') return 'too_short';
  if (pw.length < 10) return 'too_short';
  if (pw.length > 72) return 'too_long';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(pw)).length;
  return classes >= 2 ? null : 'weak';
}
