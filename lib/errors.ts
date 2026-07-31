/** Normalize unknown thrown values into a readable message. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.') {
  if (error instanceof Error && error.message.trim()) return error.message.trim();

  if (typeof error === 'string' && error.trim()) return error.trim();

  if (error && typeof error === 'object') {
    const record = error as {
      message?: unknown;
      error_description?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const message = typeof record.message === 'string' ? record.message.trim() : '';
    if (message) {
      const hint = typeof record.hint === 'string' && record.hint.trim() ? ` ${record.hint.trim()}` : '';
      return `${message}${hint}`;
    }

    if (typeof record.error_description === 'string' && record.error_description.trim()) {
      return record.error_description.trim();
    }

    if (typeof record.details === 'string' && record.details.trim()) {
      return record.details.trim();
    }
  }

  return fallback;
}

export function toError(error: unknown, fallback?: string) {
  if (error instanceof Error) return error;
  return new Error(getErrorMessage(error, fallback));
}

export function isMissingColumnError(error: unknown, column?: string) {
  const message = getErrorMessage(error, '').toLowerCase();
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  if (code === '42703' || code === 'PGRST204') {
    if (!column) return true;
    return message.includes(column.toLowerCase());
  }

  if (!column) {
    return message.includes('does not exist') && message.includes('column');
  }

  return message.includes('does not exist') && message.includes(column.toLowerCase());
}
