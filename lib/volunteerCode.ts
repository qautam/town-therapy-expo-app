/**
 * Public volunteer ID:
 *   TT-HZB-P826001
 *
 * TT     = Town Therapy
 * HZB    = Hazaribagh
 * P826001 = first letter + signup month (1–12) + year + sequence (001…)
 */

export function firstLetterFromName(fullName: string): string {
  const letter = fullName
    .normalize('NFKD')
    .replace(/[^A-Za-z]/g, '')
    .charAt(0)
    .toUpperCase();
  return letter || 'X';
}

/** Parse TT-HZB-P826001 → parts */
function parseVolunteerCode(code: string): {
  letter: string;
  month: number;
  year: number;
  seq: number;
} | null {
  const parts = code.split('-');
  if (parts.length !== 3 || parts[0] !== 'TT' || parts[1] !== 'HZB') return null;
  const body = parts[2] ?? '';
  // body = {L}{M}{YY}{NNN} — NNN is last 3 digits, YY is 2 before that, M is middle, L is first
  if (body.length < 1 + 1 + 2 + 3) return null;
  const letter = body.charAt(0);
  const seq = Number.parseInt(body.slice(-3), 10);
  const yy = Number.parseInt(body.slice(-5, -3), 10);
  const month = Number.parseInt(body.slice(1, -5), 10);
  if (!letter || !Number.isFinite(month) || !Number.isFinite(yy) || !Number.isFinite(seq)) {
    return null;
  }
  return { letter, month, year: 2000 + yy, seq };
}

export function buildVolunteerCode(input: {
  fullName: string;
  joinedAt: Date;
  sequence: number;
}): string {
  const letter = firstLetterFromName(input.fullName);
  const month = input.joinedAt.getMonth() + 1; // 1–12, no leading zero
  const yy = String(input.joinedAt.getFullYear() % 100).padStart(2, '0');
  const seq = String(Math.max(1, input.sequence)).padStart(3, '0');
  return `TT-HZB-${letter}${month}${yy}${seq}`;
}

/** Next 001/002… for a given signup month + year from existing codes. */
export function nextVolunteerSequenceForMonth(
  existingCodes: Array<string | null | undefined>,
  joinedAt: Date
): number {
  const month = joinedAt.getMonth() + 1;
  const year = joinedAt.getFullYear();
  let max = 0;
  for (const code of existingCodes) {
    if (!code) continue;
    const parsed = parseVolunteerCode(code);
    if (!parsed) continue;
    if (parsed.month !== month || parsed.year !== year) continue;
    if (parsed.seq > max) max = parsed.seq;
  }
  return max + 1;
}

export function volunteerCodeCaption(code: string): string {
  const parsed = parseVolunteerCode(code);
  if (!parsed) return 'Town Therapy volunteer · Hazaribagh';
  return `Town Therapy · Hazaribagh · ${parsed.letter} · joined ${parsed.month}/${parsed.year} · #${String(parsed.seq).padStart(3, '0')}`;
}
