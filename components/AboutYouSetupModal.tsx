import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OptionPickerModal } from '@/components/OptionPickerModal';
import {
  BIO_MAX_WORDS,
  clampBioWords,
  countWords,
  parseVolunteerSkills,
  serializeVolunteerSkills,
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
  visible: boolean;
  memberName?: string | null;
  saving?: boolean;
  onComplete: (input: SaveInput) => Promise<void>;
};

type PickerKind = 'cause' | 'skill' | 'availability' | null;

/**
 * First-time About You after signup — saving here mints the volunteer ID.
 */
export function AboutYouSetupModal({ visible, memberName, saving = false, onComplete }: Props) {
  const [bio, setBio] = useState('');
  const [cause, setCause] = useState('');
  const [skill, setSkill] = useState('');
  const [availability, setAvailability] = useState('');
  const [picker, setPicker] = useState<PickerKind>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setBio('');
    setCause('');
    setSkill('');
    setAvailability('');
    setPicker(null);
    setError('');
  }, [visible]);

  const firstName = memberName?.trim().split(/\s+/)[0];
  const wordCount = countWords(bio);
  const selectedSkills = parseVolunteerSkills(skill);

  const handleCreate = async () => {
    if (!bio.trim() || !cause.trim() || !skill.trim() || !availability.trim()) {
      setError('Add a short bio and pick your cause, skills, and availability.');
      return;
    }
    setError('');
    await onComplete({
      bio: bio.trim(),
      interests: cause,
      skills: skill,
      availability,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => {}}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="id-card-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.kicker}>ALMOST THERE</Text>
            <Text style={styles.title}>
              {firstName ? `${firstName}, tell us about you` : 'Tell us about you'}
            </Text>
            <Text style={styles.subtitle}>
              Add a few details and we’ll create your volunteer ID card right away. You can edit these
              anytime on your profile.
            </Text>
          </View>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="A short intro for your ID card"
            placeholderTextColor={Colors.textMuted}
            multiline
            value={bio}
            onChangeText={(text) => setBio(clampBioWords(text))}
            textAlignVertical="top"
          />
          <Text style={[styles.wordCount, wordCount >= BIO_MAX_WORDS && styles.wordCountMax]}>
            {wordCount}/{BIO_MAX_WORDS}
          </Text>

          <FieldButton
            icon="heart"
            label="Cause I care about most"
            value={cause}
            onPress={() => setPicker('cause')}
          />
          <FieldButton
            icon="construct"
            label="Skills"
            value={skill}
            onPress={() => setPicker('skill')}
          />
          <FieldButton
            icon="time"
            label="Availability"
            value={availability}
            onPress={() => setPicker('availability')}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.cta, (saving || pressed) && styles.ctaPressed]}
            onPress={() => void handleCreate()}
            disabled={saving}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}>
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.ctaText}>Create my volunteer ID</Text>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionPickerModal
        visible={picker === 'cause'}
        title="Cause I care about most"
        options={VOLUNTEER_CAUSES}
        value={cause}
        onSelect={(value) => {
          setCause(value);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal
        visible={picker === 'skill'}
        title="Skills"
        options={VOLUNTEER_SKILLS}
        multiple
        maxSelections={3}
        values={selectedSkills}
        onConfirm={(values) => {
          setSkill(serializeVolunteerSkills(values.slice(0, 3)));
          setPicker(null);
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
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </Modal>
  );
}

function FieldButton({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]} onPress={onPress}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.fieldCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]} numberOfLines={2}>
          {value || 'Choose'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.sm,
  },
  hero: {
    marginBottom: Spacing.md,
    gap: 6,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: Colors.orange,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  label: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  bioInput: {
    minHeight: 96,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  wordCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  wordCountMax: {
    color: Colors.orange,
    fontWeight: '700',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  fieldPressed: {
    opacity: 0.9,
  },
  fieldIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCopy: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  fieldPlaceholder: {
    color: Colors.textMuted,
    fontWeight: '500',
  },
  error: {
    marginTop: Spacing.xs,
    color: Colors.red,
    fontSize: 13,
    fontWeight: '600',
  },
  cta: {
    marginTop: Spacing.md,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
