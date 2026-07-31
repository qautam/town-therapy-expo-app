import {
  Caveat_500Medium,
  Caveat_600SemiBold,
  Caveat_700Bold,
  useFonts,
} from '@expo-google-fonts/caveat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';

import { ChalkWritingHand, type CaretPoint } from '@/components/ChalkWritingHand';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useVolunteer } from '@/context/VolunteerContext';
import { useCollapsedSection } from '@/hooks/useCollapsedSection';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import { api } from '@/lib/api';
import { playChalkScreech, preloadChalkSound } from '@/lib/chalkSound';
import {
  STICKY_NOTE_COLORS,
  formatStickyNoteRemaining,
  type StickyNote,
  type StickyNoteColor,
} from '@/lib/stickyNotes';
import { townAlert } from '@/context/TownAlertContext';

type Props = {
  guestId: string | null;
  notes: StickyNote[];
  onUpdated: (notes: StickyNote[]) => void;
};

const HAND = 'Caveat_600SemiBold';
const HAND_BOLD = 'Caveat_700Bold';
const HAND_MED = 'Caveat_500Medium';

function dayOrdinalParts(day: number): { day: string; suffix: string } {
  const mod100 = day % 100;
  let suffix = 'th';
  if (mod100 < 11 || mod100 > 13) {
    switch (day % 10) {
      case 1:
        suffix = 'st';
        break;
      case 2:
        suffix = 'nd';
        break;
      case 3:
        suffix = 'rd';
        break;
    }
  }
  return { day: String(day), suffix };
}

function formatBoardDateParts(date: Date) {
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    ...dayOrdinalParts(date.getDate()),
    month: date.toLocaleDateString('en-US', { month: 'long' }),
  };
}

function formatNoteStamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const day = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${day} · ${hour12}:${minutes} ${ampm}`;
}

/** Keeps today's date in sync with the device calendar (updates at midnight + on foreground). */
function useCalendarDay() {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setToday(new Date());

    const msUntilMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      return next.getTime() - now.getTime() + 50;
    };

    let dayTimer: ReturnType<typeof setTimeout> | undefined;

    const armMidnight = () => {
      dayTimer = setTimeout(() => {
        refresh();
        armMidnight();
      }, msUntilMidnight());
    };

    armMidnight();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      if (dayTimer) clearTimeout(dayTimer);
      subscription.remove();
    };
  }, []);

  return today;
}

function ChalkDust() {
  return (
    <View pointerEvents="none" style={styles.dustLayer}>
      {Array.from({ length: 10 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dustSpeck,
            {
              top: `${(index * 37) % 100}%`,
              left: `${(index * 53) % 100}%`,
              opacity: 0.08 + (index % 5) * 0.03,
              width: 2 + (index % 3),
              height: 2 + (index % 2),
            },
          ]}
        />
      ))}
    </View>
  );
}

const CHALK_FONT_SIZE = 24;
const CHALK_LINE_HEIGHT = 28;

function caretFromTextLayout(
  event: NativeSyntheticEvent<TextLayoutEventData>,
  boardWidth: number
): CaretPoint {
  const lines = event.nativeEvent.lines;
  if (!lines.length) return { x: 6, y: 6 + CHALK_FONT_SIZE * 0.72 };

  const last = lines[lines.length - 1];
  const maxX = Math.max(40, boardWidth - 20);
  return {
    x: Math.min(Math.max(6, last.x + last.width), maxX),
    y: last.y + CHALK_FONT_SIZE * 0.72,
  };
}

export function CitizenStickyNotes({ guestId, notes, onUpdated }: Props) {
  const { profile } = useVolunteer();
  const [saving, setSaving] = useState(false);
  const { value: composerDraft, setValue: setComposerDraft, clearDraft } = useTaskDraft(
    'chalkboard-composer',
    { text: '', color: STICKY_NOTE_COLORS[0] as StickyNoteColor },
    { pause: saving }
  );
  const draft = composerDraft.text;
  const color = composerDraft.color;
  const setColor = (next: StickyNoteColor) =>
    setComposerDraft((current) => ({ ...current, color: next }));
  const [writing, setWriting] = useState(false);
  const [boardWidth, setBoardWidth] = useState(280);
  const [caret, setCaret] = useState<CaretPoint>({ x: 8, y: 6 + CHALK_FONT_SIZE * 0.72 });
  const [strokePulse, setStrokePulse] = useState(0);
  const today = useCalendarDay();
  const { collapsed, toggle } = useCollapsedSection('chalkboard');
  const [fontsLoaded] = useFonts({
    Caveat_500Medium,
    Caveat_600SemiBold,
    Caveat_700Bold,
  });

  const hand = fontsLoaded ? HAND : undefined;
  const handBold = fontsLoaded ? HAND_BOLD : undefined;
  const handMed = fontsLoaded ? HAND_MED : undefined;
  const boardDate = formatBoardDateParts(today);

  const onWriteSurfaceLayout = (event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width);
  };

  const onMeasureTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    setCaret(caretFromTextLayout(event, boardWidth || 280));
  };

  const onDraftChange = (text: string) => {
    const added = text.length - draft.length;
    if (added > 0) {
      setStrokePulse((pulse) => pulse + 1);
      // One scrape per new character (cap paste bursts so it stays soft)
      const strokes = Math.min(added, 8);
      for (let i = 0; i < strokes; i += 1) {
        playChalkScreech();
      }
    }
    setComposerDraft((current) => ({ ...current, text }));
  };

  const postNote = async () => {
    if (!guestId || !draft.trim() || saving) return;
    setSaving(true);
    try {
      const next = await api.createStickyNote(guestId, draft, profile?.full_name, color);
      onUpdated(next);
      await clearDraft();
      setComposerDraft({
        text: '',
        color: STICKY_NOTE_COLORS[(notes.length + 1) % STICKY_NOTE_COLORS.length],
      });
    } catch (error) {
      townAlert(
        'Could not post',
        error instanceof Error ? error.message : 'Try again in a moment.'
      );
    } finally {
      setSaving(false);
    }
  };

  const removeNote = (note: StickyNote) => {
    if (!guestId || note.guest_id !== guestId) return;
    if (note.pinned) {
      townAlert('Pinned by town admin', 'This note stays on the board until an admin removes it.');
      return;
    }
    townAlert('Erase this chalk note?', 'It will disappear from the board for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: async () => {
          try {
            const next = await api.deleteStickyNote(guestId, note.id);
            onUpdated(next);
          } catch (error) {
            townAlert(
              'Could not erase',
              error instanceof Error ? error.message : 'Try again in a moment.'
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.frame}>
      <LinearGradient colors={['#F3E8DA', '#EAD9C4', '#E0CDB4']} style={styles.wood}>
        <Pressable style={styles.header} onPress={toggle}>
          <View style={styles.headerText}>
            <Text style={[styles.title, handBold && { fontFamily: handBold }]}>Leave a note</Text>
            <Text style={[styles.subtitle, hand && { fontFamily: hand }]}>
              Tips, suggestions and recommendations for the town
            </Text>
            {collapsed ? (
              <Text style={[styles.collapsedHint, hand && { fontFamily: hand }]}>
                {notes.length} note{notes.length === 1 ? '' : 's'} · Tap to expand
              </Text>
            ) : null}
          </View>
          <View style={styles.chalkIcon}>
            <Ionicons
              name={collapsed ? 'chevron-down' : 'remove'}
              size={18}
              color="#6B4F3A"
            />
          </View>
        </Pressable>

        {!collapsed ? (
          <View style={styles.board}>
            <LinearGradient
              colors={['#2A4636', '#1F3629', '#182B20']}
              style={StyleSheet.absoluteFillObject}
            />
            <ChalkDust />
            <View style={styles.ledge} />

            <View pointerEvents="none" style={styles.boardDateRow}>
              <View style={styles.boardDateInner}>
                <Text style={[styles.boardDateText, hand && { fontFamily: hand }]}>
                  {boardDate.weekday}, {boardDate.day}
                </Text>
                <Text style={[styles.boardDateOrdinal, handMed && { fontFamily: handMed }]}>
                  {boardDate.suffix}
                </Text>
                <Text style={[styles.boardDateText, hand && { fontFamily: hand }]}>
                  {' '}
                  {boardDate.month}
                </Text>
              </View>
            </View>

            <View style={styles.composer}>
              <View style={styles.writeSurface} onLayout={onWriteSurfaceLayout}>
                <TextInput
                  style={[
                    styles.composerInput,
                    hand && { fontFamily: hand },
                    { color },
                  ]}
                  placeholder="Write something for the town…"
                  placeholderTextColor="rgba(244,241,224,0.35)"
                  value={draft}
                  onChangeText={onDraftChange}
                  onFocus={() => {
                    setWriting(true);
                    preloadChalkSound();
                  }}
                  onBlur={() => setWriting(false)}
                  multiline
                  maxLength={180}
                  editable={Boolean(guestId) && !saving}
                />
                <Text
                  pointerEvents="none"
                  style={[
                    styles.measureText,
                    hand && { fontFamily: hand },
                    { width: boardWidth || undefined },
                  ]}
                  onTextLayout={onMeasureTextLayout}>
                  {draft.length > 0 ? draft : ' '}
                </Text>
                <ChalkWritingHand
                  active={writing}
                  chalkColor={color}
                  caret={caret}
                  strokePulse={strokePulse}
                />
              </View>
              <View style={styles.composerFooter}>
                <View style={styles.swatches}>
                  {STICKY_NOTE_COLORS.map((swatch) => {
                    const active = color === swatch;
                    return (
                      <Pressable
                        key={swatch}
                        onPress={() => setColor(swatch)}
                        style={[
                          styles.swatch,
                          { backgroundColor: swatch },
                          active && styles.swatchActive,
                        ]}
                      />
                    );
                  })}
                </View>
                <Pressable
                  style={[styles.postButton, (!draft.trim() || saving) && styles.postButtonDisabled]}
                  onPress={postNote}
                  disabled={!draft.trim() || saving || !guestId}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#111111" />
                  ) : (
                    <Text style={[styles.postButtonText, handBold && { fontFamily: handBold }]}>
                      Write it
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, hand && { fontFamily: hand }]}>town notes</Text>
              <View style={styles.dividerLine} />
            </View>

            {notes.length === 0 ? (
              <Text style={[styles.empty, hand && { fontFamily: hand }]}>
                The board is blank. Be the first to chalk a note.
              </Text>
            ) : (
              <View style={styles.notesGrid}>
                {notes.map((note, index) => {
                  const mine = Boolean(guestId && note.guest_id === guestId);
                  const tilt = index % 3 === 0 ? -2.2 : index % 3 === 1 ? 1.6 : -0.8;
                  return (
                    <Pressable
                      key={note.id}
                      style={[styles.note, { transform: [{ rotate: `${tilt}deg` }] }]}
                      onLongPress={() => removeNote(note)}
                      delayLongPress={350}>
                      {note.pinned ? (
                        <View style={styles.pinBadge}>
                          <Ionicons name="pin" size={11} color="#FFE08A" />
                          <Text style={[styles.pinBadgeText, handMed && { fontFamily: handMed }]}>
                            Pinned
                          </Text>
                        </View>
                      ) : null}
                      <Text
                        style={[
                          styles.noteBody,
                          hand && { fontFamily: hand },
                          { color: note.color },
                        ]}>
                        {note.body}
                      </Text>
                      <Text
                        style={[
                          styles.noteAuthor,
                          handMed && { fontFamily: handMed },
                          { color: note.color },
                        ]}>
                        — {note.author_name}
                      </Text>
                      <Text style={[styles.noteTime, handMed && { fontFamily: handMed }]}>
                        {formatNoteStamp(note.created_at)}
                        {note.pinned
                          ? ''
                          : (() => {
                              const left = formatStickyNoteRemaining(note);
                              const remaining = left ? `  ·  ${left}` : '';
                              return mine ? `${remaining}  ·  long-press to erase` : remaining;
                            })()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2D2BC',
  },
  wood: {
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 30,
    color: '#5C4030',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 18,
    lineHeight: 22,
    color: 'rgba(92,64,48,0.78)',
  },
  collapsedHint: {
    marginTop: 4,
    fontSize: 16,
    color: 'rgba(92,64,48,0.6)',
  },
  chalkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(92,64,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(92,64,48,0.18)',
  },
  board: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    minHeight: 280,
    paddingTop: Spacing.md,
    paddingLeft: Spacing.md,
    paddingRight: 28,
    paddingBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: '#243D30',
  },
  dustLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dustSpeck: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#F4F1E0',
  },
  ledge: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(244,241,224,0.12)',
  },
  boardDateRow: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 2,
  },
  boardDateInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  boardDateText: {
    fontSize: 18,
    letterSpacing: 0,
    color: 'rgba(244,241,224,0.78)',
  },
  boardDateOrdinal: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 1,
    color: 'rgba(244,241,224,0.78)',
  },
  composer: {
    borderWidth: 1,
    borderColor: 'rgba(244,241,224,0.18)',
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 28,
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  writeSurface: {
    position: 'relative',
    minHeight: 84,
    overflow: 'visible',
  },
  composerInput: {
    minHeight: 78,
    fontSize: CHALK_FONT_SIZE,
    lineHeight: CHALK_LINE_HEIGHT,
    color: '#F4F1E0',
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  measureText: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    fontSize: CHALK_FONT_SIZE,
    lineHeight: CHALK_LINE_HEIGHT,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  swatches: {
    flexDirection: 'row',
    gap: 8,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: '#F4F1E0',
    transform: [{ scale: 1.12 }],
  },
  postButton: {
    backgroundColor: '#111111',
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 78,
    alignItems: 'center',
  },
  postButtonDisabled: {
    opacity: 0.45,
  },
  postButtonText: {
    color: Colors.white,
    fontSize: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(244,241,224,0.18)',
  },
  dividerText: {
    fontSize: 18,
    color: 'rgba(244,241,224,0.55)',
    letterSpacing: 1,
  },
  empty: {
    fontSize: 22,
    lineHeight: 28,
    color: 'rgba(244,241,224,0.55)',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  note: {
    width: '47%',
    minHeight: 110,
    paddingVertical: 4,
    gap: 4,
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 2,
  },
  pinBadgeText: {
    fontSize: 14,
    color: '#FFE08A',
  },
  noteBody: {
    fontSize: 22,
    lineHeight: 26,
  },
  noteAuthor: {
    marginTop: 4,
    fontSize: 16,
    opacity: 0.85,
  },
  noteTime: {
    fontSize: 14,
    color: 'rgba(244,241,224,0.45)',
  },
});
