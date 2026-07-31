import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@town_therapy_sticky_notes';

/** Citizen chalk notes disappear after this many days unless an admin pins them. */
export const STICKY_NOTE_TTL_DAYS = 7;

export const STICKY_NOTE_COLORS = ['#F4F1E0', '#FFE08A', '#A8E6CF', '#9AD0F5', '#F5B7C8'] as const;

export type StickyNoteColor = (typeof STICKY_NOTE_COLORS)[number];

export type StickyNote = {
  id: string;
  guest_id: string;
  author_name: string;
  body: string;
  color: StickyNoteColor;
  pinned: boolean;
  pinned_at: string | null;
  created_at: string;
};

type Store = {
  notes: StickyNote[];
};

function createId() {
  return `sticky-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isStickyNoteColor(value: string): value is StickyNoteColor {
  return (STICKY_NOTE_COLORS as readonly string[]).includes(value);
}

export function stickyNoteExpiresAt(createdAt: string): Date {
  const expires = new Date(createdAt);
  expires.setDate(expires.getDate() + STICKY_NOTE_TTL_DAYS);
  return expires;
}

/** Pinned notes never expire; citizen notes last 7 days from created_at. */
export function isStickyNoteActive(note: Pick<StickyNote, 'pinned' | 'created_at'>, now = Date.now()) {
  if (note.pinned) return true;
  return stickyNoteExpiresAt(note.created_at).getTime() > now;
}

/** Remaining lifetime until auto-erase (null if pinned / already expired). */
export function stickyNoteTimeRemainingMs(
  note: Pick<StickyNote, 'pinned' | 'created_at'>,
  now = Date.now()
): number | null {
  if (note.pinned) return null;
  return Math.max(0, stickyNoteExpiresAt(note.created_at).getTime() - now);
}

/** Human label that descends as the note ages. */
export function formatStickyNoteRemaining(
  note: Pick<StickyNote, 'pinned' | 'created_at'>,
  now = Date.now()
): string | null {
  const remaining = stickyNoteTimeRemainingMs(note, now);
  if (remaining == null) return null;
  if (remaining <= 0) return 'fading soon';

  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  const days = Math.floor(remaining / dayMs);

  if (days >= 5) return 'fresh on the board';
  if (days >= 3) return 'stays a few more days';
  if (days >= 2) return 'fading this week';
  if (days >= 1) return 'last day on the board';

  const hours = Math.max(1, Math.ceil(remaining / hourMs));
  if (hours >= 8) return 'fades by tonight';
  return 'fading soon';
}

export function sortStickyNotes(notes: StickyNote[]): StickyNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

function normalizeNote(raw: Partial<StickyNote> & Pick<StickyNote, 'id' | 'body' | 'created_at'>): StickyNote {
  const color = raw.color && isStickyNoteColor(raw.color) ? raw.color : STICKY_NOTE_COLORS[0];
  return {
    id: raw.id,
    guest_id: raw.guest_id ?? '',
    author_name: raw.author_name?.trim() || 'Citizen',
    body: raw.body,
    color,
    pinned: Boolean(raw.pinned),
    pinned_at: raw.pinned_at ?? null,
    created_at: raw.created_at,
  };
}

async function readStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { notes: [] };
  try {
    const parsed = JSON.parse(raw) as Store;
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.map((note) => normalizeNote(note))
      : [];
    return { notes };
  } catch {
    return { notes: [] };
  }
}

async function writeStore(store: Store) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Drop expired citizen notes and return the active board (pinned first). */
export async function listStickyNotes(): Promise<StickyNote[]> {
  const store = await readStore();
  const active = store.notes.filter((note) => isStickyNoteActive(note));
  if (active.length !== store.notes.length) {
    store.notes = active;
    await writeStore(store);
  }
  return sortStickyNotes(active).slice(0, 40);
}

export async function createStickyNote(input: {
  guestId: string;
  authorName?: string;
  body: string;
  color?: StickyNoteColor;
  pinned?: boolean;
}): Promise<StickyNote[]> {
  const body = input.body.trim().slice(0, 180);
  if (!body) throw new Error('Write something on the sticky note first.');

  const store = await readStore();
  const color =
    input.color && isStickyNoteColor(input.color)
      ? input.color
      : STICKY_NOTE_COLORS[store.notes.length % STICKY_NOTE_COLORS.length];

  const pinned = Boolean(input.pinned);
  store.notes.unshift(
    normalizeNote({
      id: createId(),
      guest_id: input.guestId,
      author_name: input.authorName?.trim() || 'Citizen',
      body,
      color,
      pinned,
      pinned_at: pinned ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    })
  );

  store.notes = store.notes.filter((note) => isStickyNoteActive(note)).slice(0, 80);
  await writeStore(store);
  return sortStickyNotes(store.notes).slice(0, 40);
}

export async function deleteStickyNote(
  guestId: string | null,
  noteId: string,
  options?: { asAdmin?: boolean }
): Promise<StickyNote[]> {
  const store = await readStore();
  store.notes = store.notes.filter((note) => {
    if (note.id !== noteId) return true;
    if (options?.asAdmin) return false;
    // Citizens can only erase their own unpinned notes
    if (note.pinned) return true;
    return !(guestId && note.guest_id === guestId);
  });
  await writeStore(store);
  return listStickyNotes();
}

export async function setStickyNotePinned(noteId: string, pinned: boolean): Promise<StickyNote[]> {
  const store = await readStore();
  const now = new Date().toISOString();
  store.notes = store.notes.map((note) =>
    note.id === noteId
      ? {
          ...note,
          pinned,
          pinned_at: pinned ? now : null,
        }
      : note
  );
  await writeStore(store);
  return listStickyNotes();
}
