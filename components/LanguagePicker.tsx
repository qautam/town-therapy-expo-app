import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { useLocale } from '@/context/LocaleContext';
import type { AppLocale } from '@/lib/i18n';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  onDone: () => void;
};

export function LanguagePicker({ onDone }: Props) {
  const { locale, setLocale, t } = useLocale();
  const [selected, setSelected] = useState<AppLocale>(locale || 'en');
  const [saving, setSaving] = useState(false);

  const choose = async (next: AppLocale) => {
    setSelected(next);
    await setLocale(next);
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setLocale(selected);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.background}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            <TownTherapyLogo size={88} withShadow />
            <Text style={styles.title}>{t('lang.title')}</Text>
            <Text style={styles.subtitle}>{t('lang.subtitle')}</Text>

            <View style={styles.options}>
              <Pressable
                style={[styles.option, selected === 'en' && styles.optionActive]}
                onPress={() => void choose('en')}>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, selected === 'en' && styles.optionTitleActive]}>
                    {t('lang.english')}
                  </Text>
                  <Text style={styles.optionHint}>Default</Text>
                </View>
                {selected === 'en' ? (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="rgba(255,255,255,0.45)" />
                )}
              </Pressable>

              <Pressable
                style={[styles.option, selected === 'hi' && styles.optionActive]}
                onPress={() => void choose('hi')}>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, selected === 'hi' && styles.optionTitleActive]}>
                    {t('lang.hindi')}
                  </Text>
                  <Text style={styles.optionHint}>Hindi</Text>
                </View>
                {selected === 'hi' ? (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="rgba(255,255,255,0.45)" />
                )}
              </Pressable>
            </View>

            <Pressable
              style={[styles.continue, saving && styles.continueDisabled]}
              onPress={() => void finish()}
              disabled={saving}>
              <Text style={styles.continueText}>{t('lang.continue')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  background: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    marginTop: Spacing.md,
    color: Colors.white,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '500',
  },
  options: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionActive: {
    borderColor: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 18,
    fontWeight: '800',
  },
  optionTitleActive: {
    color: Colors.white,
  },
  optionHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  continue: {
    marginTop: Spacing.lg,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
  },
  continueDisabled: {
    opacity: 0.7,
  },
  continueText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
});
