import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useVolunteer } from '@/context/VolunteerContext';
import { communityFilters } from '@/constants/data';
import { api } from '@/lib/api';
import type { CommunityPost } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';

const postCategories = communityFilters.filter((c) => c !== 'All') as CommunityPost['category'][];

export default function NewPostScreen() {
  const router = useRouter();
  const { guestId } = useVolunteer();
  const [category, setCategory] = useState<CommunityPost['category']>('Success');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!guestId || !title.trim()) {
      Alert.alert('Missing details', 'Add a title for your story.');
      return;
    }

    setLoading(true);
    try {
      await api.createPost(guestId, {
        category,
        title: title.trim(),
        description: description.trim(),
      });
      Alert.alert('Story shared', 'Thanks for celebrating community wins.');
      router.back();
    } catch (error) {
      Alert.alert('Could not post', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {postCategories.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, category === item && styles.chipActive]}
              onPress={() => setCategory(item)}>
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="Headline"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell the story"
          placeholderTextColor={Colors.textMuted}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Pressable style={styles.submit} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Share story</Text>
          )}
        </Pressable>
      </ScrollView>
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
