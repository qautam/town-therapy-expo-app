import { useRouter, type Href } from 'expo-router';
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
import { AboutYouSetupModal } from '@/components/AboutYouSetupModal';
import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { WelcomeMemberModal } from '@/components/WelcomeMemberModal';
import { useVolunteer } from '@/context/VolunteerContext';
import { townAlert } from '@/context/TownAlertContext';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useKeyboardVerticalOffset } from '@/hooks/useKeyboardVerticalOffset';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import { isEmailAlreadyRegisteredError } from '@/lib/newsletter';
import { normalizeVolunteerName } from '@/lib/volunteerName';

type Mode = 'choose' | 'signup' | 'signin' | 'manage';

type NewsletterDraft = {
  mode: Mode;
  fullName: string;
  email: string;
  eventUpdates: boolean;
  townNewsletter: boolean;
};

const EMPTY_NEWSLETTER_DRAFT: NewsletterDraft = {
  mode: 'choose',
  fullName: '',
  email: '',
  eventUpdates: true,
  townNewsletter: true,
};

export default function NewsletterScreen() {
  const router = useRouter();
  const { newsletter, newsletterSignUp, newsletterSignIn, completeAboutYouOnboarding } =
    useVolunteer();
  const keyboardOffset = useKeyboardVerticalOffset();
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAboutSetup, setShowAboutSetup] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const { value: draft, setValue: setDraft, clearDraft } = useTaskDraft(
    'newsletter-signup',
    EMPTY_NEWSLETTER_DRAFT,
    { pause: loading || savingAbout }
  );
  const { mode, fullName, email, eventUpdates, townNewsletter } = draft;

  useEffect(() => {
    if (!newsletter) return;
    setDraft((current) => ({
      ...current,
      mode: current.mode === 'signin' || current.mode === 'signup' ? current.mode : 'manage',
      fullName: newsletter.full_name,
      email: newsletter.email,
      eventUpdates: newsletter.event_updates,
      townNewsletter: newsletter.town_newsletter,
    }));
  }, [newsletter, setDraft]);

  const goChoose = () => setDraft((current) => ({ ...current, mode: 'choose' }));

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
      if (isEmailAlreadyRegisteredError(error)) {
        townAlert(
          'This email is already signed up',
          'Please sign in with this email instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign in',
              onPress: () =>
                setDraft((current) => ({
                  ...current,
                  mode: 'signin',
                  email: email.trim().toLowerCase(),
                })),
            },
          ]
        );
        return;
      }
      townAlert('Sign up failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      townAlert('Missing email', 'Enter the email you signed up with.');
      return;
    }

    setLoading(true);
    try {
      await newsletterSignIn(email.trim());
      await clearDraft();
      router.replace('/(tabs)/profile' as Href);
      townAlert('Welcome back', 'Your volunteer profile is synced on this device.');
    } catch (error) {
      townAlert('Sign in failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAboutSetup = async (input: {
    bio: string;
    interests: string;
    skills: string;
    availability: string;
  }) => {
    setSavingAbout(true);
    try {
      await completeAboutYouOnboarding(input);
      setShowAboutSetup(false);
      router.replace('/(tabs)/profile' as Href);
      townAlert('Your volunteer ID is ready', 'You can edit About You anytime on your profile.');
    } catch (error) {
      townAlert(
        'Could not create your ID',
        error instanceof Error ? error.message : 'Try again.'
      );
    } finally {
      setSavingAbout(false);
    }
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
            Create your volunteer profile and start at Supporter level. No password needed.
          </Text>
        </View>

        {mode === 'choose' || mode === 'manage' ? (
          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => setDraft((current) => ({ ...current, mode: 'signup' }))}
              disabled={loading}>
              <Text style={styles.primaryButtonText}>Sign up</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setDraft((current) => ({ ...current, mode: 'signin' }))}
              disabled={loading}>
              <Text style={styles.secondaryButtonText}>Sign in</Text>
            </Pressable>
            <Pressable style={styles.skipButton} onPress={() => router.back()} disabled={loading}>
              <Text style={styles.skipButtonText}>Continue without signing up</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'signin' ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign in</Text>
            <Text style={styles.formHint}>Use the email you signed up with.</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={(value) => setDraft((current) => ({ ...current, email: value }))}
            />
            <Pressable style={styles.primaryButton} onPress={handleSignIn} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in</Text>
              )}
            </Pressable>
            <Pressable style={styles.skipButton} onPress={goChoose} disabled={loading}>
              <Text style={styles.skipButtonText}>Back</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'signup' ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign up</Text>
            <Text style={styles.formHint}>We’ll use this to save your volunteer profile.</Text>
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
                  <Text style={styles.preferenceSubtitle}>
                    Community wins, reforms, and civic news
                  </Text>
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

            <Pressable style={styles.primaryButton} onPress={handleSignUp} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign up</Text>
              )}
            </Pressable>
            <Pressable style={styles.skipButton} onPress={goChoose} disabled={loading}>
              <Text style={styles.skipButtonText}>Back</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      <WelcomeMemberModal
        visible={showWelcome}
        memberName={welcomeName}
        onDismiss={() => {
          setShowWelcome(false);
          setShowAboutSetup(true);
        }}
      />

      <AboutYouSetupModal
        visible={showAboutSetup}
        memberName={welcomeName || newsletter?.full_name}
        saving={savingAbout}
        onComplete={handleAboutSetup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  hero: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.sm,
  },
  form: {
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  formHint: {
    marginTop: -8,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  preferenceCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  preferenceText: { flex: 1 },
  preferenceTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  preferenceSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryButtonText: {
    color: Colors.primaryDark,
    fontWeight: '800',
    fontSize: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
