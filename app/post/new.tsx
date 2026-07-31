import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { useVolunteer } from '@/context/VolunteerContext';
import { useKeyboardVerticalOffset } from '@/hooks/useKeyboardVerticalOffset';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import { communityFilters } from '@/constants/data';
import { api } from '@/lib/api';
import type { CommunityPost } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { townAlert } from '@/context/TownAlertContext';

const postCategories = communityFilters.filter((c) => c !== 'All') as CommunityPost['category'][];

type PostDraft = {
  category: CommunityPost['category'];
  title: string;
  description: string;
};

const EMPTY_POST_DRAFT: PostDraft = {
  category: 'Success',
  title: '',
  description: '',
};

export default function NewPostScreen() {
  const router = useRouter();
  const keyboardOffset = useKeyboardVerticalOffset();
  const { guestId } = useVolunteer();
  const [loading, setLoading] = useState(false);
  const { value: draft, setValue: setDraft, clearDraft } = useTaskDraft('post-new', EMPTY_POST_DRAFT, {
    pause: loading,
  });
  const { category, title, description } = draft;

  const submit = async () => {
    if (!guestId || !title.trim()) {
      townAlert('Missing details', 'Add a title for your story.');
      return;
    }

    setLoading(true);
    try {
      await api.createPost(guestId, {
        category,
        title: title.trim(),
        description: description.trim(),
      });
      await clearDraft();
      townAlert('Story shared', 'Thanks for celebrating community wins.');
      router.back();
    } catch (error) {
      townAlert('Could not post', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardVerticalOffset={keyboardOffset}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {postCategories.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, category === item && styles.chipActive]}
              onPress={() => setDraft((current) => ({ ...current, category: item }))}>
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="Headline"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell the story"
          placeholderTextColor={Colors.textMuted}
          multiline
          value={description}
          onChangeText={(value) => setDraft((current) => ({ ...current, description: value }))}
        />

        <Pressable style={styles.submit} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Share story</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  chips: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
