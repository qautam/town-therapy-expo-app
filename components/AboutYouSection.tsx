import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OptionPickerModal } from '@/components/OptionPickerModal';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import {
  BIO_MAX_WORDS,
  clampBioWords,
  countWords,
  VOLUNTEER_AVAILABILITY,
  VOLUNTEER_CAUSES,
  VOLUNTEER_SKILLS,
} from '@/constants/volunteerProfile';
import { Colors, Radius, Spacing } from '@/constants/theme';

type SaveInput = {
  bio: string;
  interests: string;
  skills: string;
  availability: string;
};

type Props = {
  bio: string;
  cause: string;
  skill: string;
  availability: string;
  saving?: boolean;
  onSave: (input: SaveInput) => Promise<void>;
};

type PickerKind = 'cause' | 'skill' | 'availability' | null;
type SavingField = 'bio' | 'cause' | 'skill' | 'availability' | null;

type AboutDraft = {
  bio: string;
  cause: string;
  skill: string;
  availability: string;
  editingBio: boolean;
};

export function AboutYouSection({
  bio: initialBio,
  cause: initialCause,
  skill: initialSkill,
  availability: initialAvailability,
  saving = false,
  onSave,
}: Props) {
  const [picker, setPicker] = useState<PickerKind>(null);
  const [savingField, setSavingField] = useState<SavingField>(null);
  const { value: draft, setValue: setDraft, hydrated } = useTaskDraft<AboutDraft>(
    'profile-about',
    {
      bio: initialBio,
      cause: initialCause,
      skill: initialSkill,
      availability: initialAvailability,
      editingBio: false,
    },
    { pause: saving || Boolean(savingField) }
  );
  const { bio, cause, skill, availability, editingBio } = draft;

  useEffect(() => {
    if (!hydrated) return;
    setDraft((current) => ({
      ...current,
      bio: current.editingBio ? current.bio : initialBio,
      cause: initialCause,
      skill: initialSkill,
      availability: initialAvailability,
    }));
  }, [hydrated, initialAvailability, initialBio, initialCause, initialSkill, setDraft]);

  const setBio = (next: string) => setDraft((current) => ({ ...current, bio: next }));
  const setCause = (next: string) => setDraft((current) => ({ ...current, cause: next }));
  const setSkill = (next: string) => setDraft((current) => ({ ...current, skill: next }));
  const setAvailability = (next: string) =>
    setDraft((current) => ({ ...current, availability: next }));
  const setEditingBio = (next: boolean) =>
    setDraft((current) => ({ ...current, editingBio: next }));

  const wordCount = countWords(bio);
  const bioDirty = bio.trim() !== initialBio.trim();

  const buildPayload = (overrides: Partial<SaveInput> = {}): SaveInput => ({
    bio: (overrides.bio ?? bio).trim(),
    interests: overrides.interests ?? cause,
    skills: overrides.skills ?? skill,
    availability: overrides.availability ?? availability,
  });

  const persist = async (overrides: Partial<SaveInput>, field: SavingField) => {
    if (saving || savingField) return;
    setSavingField(field);
    try {
      await onSave(buildPayload(overrides));
      if (field === 'bio') {
        setDraft((current) => ({
          ...current,
          editingBio: false,
          bio: (overrides.bio ?? current.bio).trim(),
        }));
      }
    } finally {
      setSavingField(null);
    }
  };

  const saveBio = async () => {
    if (!bioDirty) {
      setEditingBio(false);
      return;
    }
    await persist({}, 'bio');
  };

  return (
    <View style={styles.card}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Bio</Text>
        {editingBio ? (
          <View style={styles.bioEditor}>
            <TextInput
              style={styles.bioInput}
              placeholder="Short intro"
              placeholderTextColor={Colors.textMuted}
              multiline
              autoFocus
              value={bio}
              onChangeText={(text) => setBio(clampBioWords(text))}
              textAlignVertical="top"
            />
            <View style={styles.bioEditorFooter}>
              <Text style={[styles.wordCount, wordCount >= BIO_MAX_WORDS && styles.wordCountMax]}>
                {wordCount}/{BIO_MAX_WORDS}
              </Text>
              <View style={styles.bioActions}>
                <Pressable
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                  onPress={() => {
                    setBio(initialBio);
                    setEditingBio(false);
                  }}
                  hitSlop={8}
                  accessibilityLabel="Cancel bio edit">
                  <Ionicons name="close" size={16} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    (savingField === 'bio' || pressed) && styles.saveBtnPressed,
                  ]}
                  onPress={() => void saveBio()}
                  disabled={Boolean(savingField)}
                  hitSlop={8}
                  accessibilityLabel="Save bio">
                  {savingField === 'bio' ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.bioPreview, pressed && styles.rowPressed]}
            onPress={() => setEditingBio(true)}>
            <View style={styles.bioPreviewCopy}>
              <Text
                style={[styles.bioPreviewText, !initialBio.trim() && styles.placeholderText]}
                numberOfLines={2}>
                {initialBio.trim() || 'Tap to add'}
              </Text>
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color={Colors.primary} />
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <FieldRow
          icon="heart"
          iconBg={Colors.orangeLight}
          iconColor={Colors.orange}
          label="Cause I care about"
          value={cause}
          placeholder="Choose"
          saving={savingField === 'cause'}
          onPress={() => setPicker('cause')}
        />
        <FieldRow
          icon="construct"
          label="Skill"
          value={skill}
          placeholder="Choose"
          saving={savingField === 'skill'}
          onPress={() => setPicker('skill')}
        />
        <FieldRow
          icon="time"
          label="Availability"
          value={availability}
          placeholder="Choose"
          saving={savingField === 'availability'}
          onPress={() => setPicker('availability')}
        />
      </View>

      <OptionPickerModal
        visible={picker === 'cause'}
        title="Cause I care about"
        options={VOLUNTEER_CAUSES}
        value={cause}
        onSelect={(value) => {
          setCause(value);
          void persist({ interests: value }, 'cause');
        }}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal
        visible={picker === 'skill'}
        title="Skill"
        options={VOLUNTEER_SKILLS}
        value={skill}
        onSelect={(value) => {
          setSkill(value);
          void persist({ skills: value }, 'skill');
        }}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal
        visible={picker === 'availability'}
        title="Availability"
        options={VOLUNTEER_AVAILABILITY}
        value={availability}
        onSelect={(value) => {
          setAvailability(value);
          void persist({ availability: value }, 'availability');
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function FieldRow({
  icon,
  iconBg = Colors.greenLight,
  iconColor = Colors.primary,
  label,
  value,
  placeholder,
  saving = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value: string;
  placeholder: string;
  saving?: boolean;
  onPress: () => void;
}) {
  const filled = Boolean(value.trim());

  return (
    <Pressable
      style={({ pressed }) => [styles.fieldRow, pressed && styles.rowPressed, saving && styles.rowSaving]}
      onPress={onPress}
      disabled={saving}>
      <View style={[styles.fieldIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.fieldCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !filled && styles.placeholderText]} numberOfLines={1}>
          {filled ? value : placeholder}
        </Text>
      </View>
      {saving ? (
        <ActivityIndicator color={Colors.primary} size="small" />
      ) : filled ? (
        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    shadowColor: '#1A2F2F',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  bioPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 2,
    minHeight: 56,
  },
  bioPreviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  bioPreviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bioEditor: {
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    padding: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  bioInput: {
    minHeight: 56,
    maxHeight: 80,
    padding: 0,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  bioEditorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  wordCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  wordCountMax: {
    color: Colors.primary,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm + 2,
    minHeight: 64,
  },
  rowPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  rowSaving: {
    opacity: 0.75,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
});
