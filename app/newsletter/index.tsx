import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { useKeyboardVerticalOffset } from '@/hooks/useKeyboardVerticalOffset';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import { WelcomeMemberModal } from '@/components/WelcomeMemberModal';
import { useVolunteer } from '@/context/VolunteerContext';
import { brand } from '@/constants/data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { normalizeVolunteerName } from '@/lib/volunteerName';
import { townAlert } from '@/context/TownAlertContext';

type Mode = 'signup' | 'signin' | 'manage';

type NewsletterDraft = {
  mode: Mode;
  fullName: string;
  email: string;
  eventUpdates: boolean;
  townNewsletter: boolean;
};

const EMPTY_NEWSLETTER_DRAFT: NewsletterDraft = {
  mode: 'signup',
  fullName: '',
  email: '',
  eventUpdates: true,
  townNewsletter: true,
};

export default function NewsletterScreen() {
  const router = useRouter();
  const {
    newsletter,
    newsletterSignUp,
    newsletterSignIn,
    updateNewsletter,
    newsletterUnsubscribe,
  } = useVolunteer();
  const keyboardOffset = useKeyboardVerticalOffset();
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const { value: draft, setValue: setDraft, clearDraft } = useTaskDraft(
    'newsletter-signup',
    EMPTY_NEWSLETTER_DRAFT,
    { pause: loading }
  );
  const { mode, fullName, email, eventUpdates, townNewsletter } = draft;

  useEffect(() => {
    if (!newsletter) return;
    setDraft({
      mode: 'manage',
      fullName: newsletter.full_name,
      email: newsletter.email,
      eventUpdates: newsletter.event_updates,
      townNewsletter: newsletter.town_newsletter,
    });
  }, [newsletter, setDraft]);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim()) {
      townAlert('Missing details', 'Enter your name and email.');
      return;
    }
    if (!eventUpdates && !townNewsletter) {
      townAlert('Choose at least one', 'Select event updates or the town newsletter.');
      return;
    }

    setLoading(true);
    try {
      const name = normalizeVolunteerName(fullName);
      if (!name) {
        townAlert('Missing details', 'Enter your name and email.');
        return;
      }
      await newsletterSignUp({
        full_name: name,
        email: email.trim(),
        event_updates: eventUpdates,
        town_newsletter: townNewsletter,
      });
      setWelcomeName(name);
      setDraft((current) => ({ ...current, mode: 'manage', fullName: name }));
      await clearDraft();
      setShowWelcome(true);
    } catch (error) {
      townAlert('Sign up failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      townAlert('Missing email', 'Enter the email you subscribed with.');
      return;
    }

    setLoading(true);
    try {
      await newsletterSignIn(email.trim());
      await clearDraft();
      townAlert('Welcome back', 'Your email preferences are synced on this device.');
      setDraft((current) => ({ ...current, mode: 'manage' }));
    } catch (error) {
      townAlert('Sign in failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!eventUpdates && !townNewsletter) {
      townAlert('Choose at least one', 'Select event updates or the town newsletter.');
      return;
    }

    setLoading(true);
    try {
      await updateNewsletter({
        full_name: normalizeVolunteerName(fullName),
        event_updates: eventUpdates,
        town_newsletter: townNewsletter,
      });
      townAlert('Saved', 'Your email preferences were updated.');
    } catch (error) {
      townAlert('Update failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = () => {
    townAlert(
      'Unsubscribe?',
      'You will stop receiving event and newsletter emails.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await newsletterUnsubscribe();
              await clearDraft();
              setDraft(EMPTY_NEWSLETTER_DRAFT);
              townAlert('Unsubscribed', 'You can sign up again anytime.');
            } catch (error) {
              townAlert('Error', error instanceof Error ? error.message : 'Try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardVerticalOffset={keyboardOffset}>
        <View style={styles.hero}>
          <TownTherapyLogo size={72} withShadow />
          <Text style={styles.title}>Become a volunteer</Text>
          <Text style={styles.subtitle}>
            Sign up to create your volunteer profile and start at Supporter level. No password needed
            to use the app.
          </Text>
        </View>

        {mode !== 'manage' ? (
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => setDraft((current) => ({ ...current, mode: 'signup' }))}>
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign up</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'signin' && styles.tabActive]}
              onPress={() => setDraft((current) => ({ ...current, mode: 'signin' }))}>
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'signin' ? (
          <>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email you subscribed with"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={(value) => setDraft((current) => ({ ...current, email: value }))}
            />
            <Pressable style={styles.primaryButton} onPress={handleSignIn} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in to sync preferences</Text>
              )}
            </Pressable>
          </>
        ) : null}

        {mode === 'signup' || mode === 'manage' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={Colors.textMuted}
              value={fullName}
              onChangeText={(value) => setDraft((current) => ({ ...current, fullName: value }))}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={(value) => setDraft((current) => ({ ...current, email: value }))}
              editable={mode === 'signup'}
            />

            <View style={styles.preferenceCard}>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>Event updates</Text>
                  <Text style={styles.preferenceSubtitle}>
                    Push alerts and reminders for new cleanup drives
                  </Text>
                </View>
                <Switch
                  value={eventUpdates}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, eventUpdates: value }))
                  }
                  trackColor={{ true: Colors.primary, false: Colors.border }}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>Town newsletter</Text>
                  <Text style={styles.preferenceSubtitle}>Community wins, reforms, and civic news</Text>
                </View>
                <Switch
                  value={townNewsletter}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, townNewsletter: value }))
                  }
                  trackColor={{ true: Colors.primary, false: Colors.border }}
                />
              </View>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={mode === 'manage' ? handleSavePreferences : handleSignUp}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'manage' ? 'Save preferences' : 'Sign up'}
                </Text>
              )}
            </Pressable>

            {mode === 'manage' ? (
              <Pressable style={styles.secondaryButton} onPress={handleUnsubscribe} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Unsubscribe</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <Pressable style={styles.skip} onPress={() => router.back()}>
          <Text style={styles.skipText}>Continue without signing up</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <WelcomeMemberModal
        visible={showWelcome}
        memberName={welcomeName}
        onDismiss={() => {
          setShowWelcome(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  hero: {
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.white },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.pill },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
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
  preferenceCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  preferenceText: { flex: 1 },
  preferenceTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  preferenceSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.red,
  },
  secondaryButtonText: { color: Colors.red, fontWeight: '700' },
  skip: { alignItems: 'center', paddingVertical: Spacing.sm },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
