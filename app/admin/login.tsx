import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { brand } from '@/constants/data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  CLOUD_ADMIN_EMAIL,
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD,
} from '@/lib/adminCredentials';
import { isSupabaseConfigured } from '@/lib/config';
import { townAlert } from '@/context/TownAlertContext';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { signIn } = useAdminAuth();
  const [email, setEmail] = useState(isSupabaseConfigured ? CLOUD_ADMIN_EMAIL : LOCAL_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      townAlert('Missing details', 'Enter admin email and password.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password.trim());
      router.replace('/admin');
    } catch (error) {
      townAlert('Login failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <TownTherapyLogo size={64} />
        </View>
        <Text style={styles.title}>Admin login</Text>
        <Text style={styles.subtitle}>
          Volunteers use the app without signing in. Only town admins need to log in here.
        </Text>

        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          keyboardType="email-address"
          placeholder="Admin email"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.button} onPress={handleSignIn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Sign in as admin</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>
          {isSupabaseConfigured
            ? `Cloud admin: ${CLOUD_ADMIN_EMAIL}\nPassword: ${LOCAL_ADMIN_PASSWORD}`
            : `Demo local login: ${LOCAL_ADMIN_EMAIL}\nPassword: ${LOCAL_ADMIN_PASSWORD}\n${brand.name} · ${brand.location}`}
        </Text>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    marginTop: Spacing.lg,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
