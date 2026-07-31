/** Normalize Indian mobile numbers to 10 digits, or null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return null;
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone) ?? phone.replace(/\D/g, '');
  if (normalized.length === 10) {
    return `${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  }
  return phone.trim();
}

export function phoneTelUrl(phone: string): string {
  const normalized = normalizePhone(phone) ?? phone.replace(/\D/g, '');
  return `tel:+91${normalized}`;
}
