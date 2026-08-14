export const LOCAL_ADMIN_PASSWORD = 'towntherapy';
export const LOCAL_ADMIN_EMAIL = 'admin@towntherapy.app';
export const CLOUD_ADMIN_EMAIL = 'admin@towntherapy.club';

const ADMIN_EMAIL_ALIASES = new Set([LOCAL_ADMIN_EMAIL, CLOUD_ADMIN_EMAIL]);

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isLocalAdminEmail(email: string) {
  return ADMIN_EMAIL_ALIASES.has(normalizeAdminEmail(email));
}

export function alternateAdminEmail(email: string) {
  const normalized = normalizeAdminEmail(email);
  if (normalized === LOCAL_ADMIN_EMAIL) return CLOUD_ADMIN_EMAIL;
  if (normalized === CLOUD_ADMIN_EMAIL) return LOCAL_ADMIN_EMAIL;
  return null;
}

export function isInvalidCredentialMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid admin email or password')
  );
}
