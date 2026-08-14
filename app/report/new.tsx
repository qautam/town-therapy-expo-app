import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { PublicSafetySection } from '@/components/PublicSafetySection';
import { useKeyboardVerticalOffset } from '@/hooks/useKeyboardVerticalOffset';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import { useLocale } from '@/context/LocaleContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { REPORT_CATEGORIES, REPORT_SEVERITIES, type ReportSeverity } from '@/constants/reports';
import { api } from '@/lib/api';
import { formatCoords, getCurrentLocation } from '@/lib/location';
import { promptReportPhoto } from '@/lib/reportPhoto';
import { volunteerSignupHref } from '@/lib/volunteerGate';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { townAlert } from '@/context/TownAlertContext';
import { getErrorMessage } from '@/lib/errors';

type GeoState = {
  latitude: number;
  longitude: number;
  label: string;
};

type ReportDraft = {
  title: string;
  description: string;
  categoryId: string;
  severity: ReportSeverity;
  photoUri: string | null;
  locationLabel: string;
  geo: GeoState | null;
};

const EMPTY_REPORT_DRAFT: ReportDraft = {
  title: '',
  description: '',
  categoryId: REPORT_CATEGORIES[0].id,
  severity: 'moderate',
  photoUri: null,
  locationLabel: '',
  geo: null,
};

export default function NewReportScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { t } = useLocale();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const focusSos = focus === 'sos';
  const keyboardOffset = useKeyboardVerticalOffset();
  const { guestId, newsletter, profile, loading: volunteerLoading, refresh } = useVolunteer();
  const isRegistered = Boolean(profile?.registered);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { value: draft, setValue: setDraft, hydrated, clearDraft } = useTaskDraft(
    'report-new',
    EMPTY_REPORT_DRAFT,
    { pause: loading }
  );

  const goToSignup = useCallback(() => {
    router.push(volunteerSignupHref(newsletter));
  }, [newsletter, router]);

  const { title, description, categoryId, severity, photoUri, locationLabel, geo } = draft;

  const category = useMemo(
    () => REPORT_CATEGORIES.find((item) => item.id === categoryId) ?? REPORT_CATEGORIES[0],
    [categoryId]
  );

  const captureLocation = useCallback(async () => {
    setLocating(true);
    setLocationError(null);

    try {
      const point = await getCurrentLocation();
      setDraft((current) => ({
        ...current,
        geo: point,
        locationLabel: point.label,
      }));
    } catch {
      setLocationError('Location permission is required to geotag your report.');
      setDraft((current) => ({ ...current, geo: null }));
    } finally {
      setLocating(false);
    }
  }, [setDraft]);

  useEffect(() => {
    if (!hydrated) return;
    if (geo) {
      setLocating(false);
      return;
    }
    captureLocation();
  }, [captureLocation, geo, hydrated]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: undefined });
  }, [navigation]);

  const pickPhoto = useCallback(() => {
    promptReportPhoto((uri) => setDraft((current) => ({ ...current, photoUri: uri })));
  }, [setDraft]);

  const submit = useCallback(async () => {
    if (volunteerLoading || !guestId) {
      townAlert('Please wait', 'Your profile is still loading. Try again in a moment.');
      return;
    }

    if (!isRegistered) {
      townAlert(
        'Almost there',
        'Create your free volunteer profile to submit this report. Your draft is saved.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign up', onPress: goToSignup },
        ]
      );
      return;
    }

    if (!title.trim()) {
      townAlert('Missing details', 'Add a short title describing the issue.');
      return;
    }

    if (!geo) {
      townAlert(
        'Location required',
        'Reports must be geotagged so the town can act on them. Refresh your location or enter one manually.'
      );
      return;
    }

    setLoading(true);
    try {
      const hadPhoto = Boolean(photoUri);
      await api.createReport(guestId, {
        title: title.trim(),
        description: description.trim(),
        category: category.label,
        severity,
        location_label: locationLabel.trim() || geo.label,
        latitude: geo.latitude,
        longitude: geo.longitude,
        photo_uri: photoUri ?? undefined,
      });

      await refresh({ reconcile: true });
      await clearDraft();
      townAlert(
        'Report submitted',
        hadPhoto
          ? 'Thanks for helping improve Hazaribagh. If the photo did not upload, the report was still saved.'
          : 'Thanks for helping improve Hazaribagh.'
      );
      navigation.goBack();
    } catch (error) {
      townAlert('Could not submit', getErrorMessage(error, 'Try again.'));
    } finally {
      setLoading(false);
    }
  }, [
    category.label,
    clearDraft,
    description,
    geo,
    goToSignup,
    guestId,
    isRegistered,
    locationLabel,
    navigation,
    photoUri,
    refresh,
    severity,
    title,
    volunteerLoading,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardVerticalOffset={keyboardOffset}>
        {focusSos ? (
          <>
            <Text style={styles.formHeading}>{t('reportNew.sosTitle')}</Text>
            <Text style={styles.formSubheading}>{t('reportNew.sosSub')}</Text>
            <PublicSafetySection
              guestId={guestId}
              geo={geo}
              locating={locating}
              locationError={locationError}
              onRefreshLocation={captureLocation}
            />
          </>
        ) : (
          <>
            <Text style={styles.formHeading}>{t('reportNew.civicTitle')}</Text>
            <Text style={styles.formSubheading}>{t('reportNew.civicSub')}</Text>

            {!volunteerLoading && !isRegistered ? (
              <Pressable style={styles.signupGate} onPress={goToSignup}>
                <View style={styles.signupGateIcon}>
                  <Ionicons name="person-add-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.signupGateCopy}>
                  <Text style={styles.signupGateTitle}>{t('reportNew.signupTitle')}</Text>
                  <Text style={styles.signupGateHint}>{t('reportNew.signupHint')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
              </Pressable>
            ) : null}

            <Text style={styles.sectionLabel}>{t('reportNew.issueType')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              {REPORT_CATEGORIES.map((item) => {
                const active = categoryId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setDraft((current) => ({ ...current, categoryId: item.id }))}>
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={active ? Colors.white : Colors.primary}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {REPORT_SEVERITIES.map((item) => {
                const active = severity === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setDraft((current) => ({ ...current, severity: item.id }))}
                    style={[
                      styles.severityButton,
                      { borderColor: item.color, backgroundColor: item.softColor },
                      active && { backgroundColor: item.color },
                    ]}>
                    <Text
                      style={[
                        styles.severityText,
                        { color: item.color },
                        active && styles.severityTextActive,
                      ]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Issue title"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={category.placeholder}
              placeholderTextColor={Colors.textMuted}
              multiline
              value={description}
              onChangeText={(value) => setDraft((current) => ({ ...current, description: value }))}
            />

            <Text style={styles.sectionLabel}>Location</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <View style={styles.locationTitleRow}>
                  <Ionicons name="location" size={18} color={Colors.primary} />
                  <Text style={styles.locationTitle}>Geotagged location</Text>
                </View>
                <Pressable style={styles.refreshButton} onPress={captureLocation} disabled={locating}>
                  {locating ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={16} color={Colors.white} />
                      <Text style={styles.refreshText}>Refresh</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {geo ? (
                <>
                  <Text style={styles.coords}>{formatCoords(geo.latitude, geo.longitude)}</Text>
                  <Text style={styles.locationHint}>
                    Pin this report to the spot you are reporting from.
                  </Text>
                </>
              ) : (
                <Text style={styles.locationError}>
                  {locationError ?? 'Detecting your location…'}
                </Text>
              )}

              <TextInput
                style={[styles.input, styles.locationInput]}
                placeholder="Landmark or address (optional edit)"
                placeholderTextColor={Colors.textMuted}
                value={locationLabel}
                onChangeText={(value) =>
                  setDraft((current) => ({ ...current, locationLabel: value }))
                }
              />
            </View>

            <Text style={styles.sectionLabel}>Photo evidence</Text>
            <Pressable style={styles.photoButton} onPress={pickPhoto}>
              <Ionicons
                name={photoUri ? 'image-outline' : 'camera-outline'}
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.photoText}>
                {photoUri ? 'Change photo' : 'Take or upload photo'}
              </Text>
            </Pressable>
            {photoUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: photoUri }} style={styles.preview} />
                <Pressable
                  style={styles.removePhoto}
                  onPress={() => setDraft((current) => ({ ...current, photoUri: null }))}
                  hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={Colors.white} />
                </Pressable>
              </View>
            ) : null}

            <Pressable style={styles.submit} onPress={submit} disabled={loading || locating}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="megaphone-outline" size={18} color={Colors.white} />
                  <Text style={styles.submitText}>
                    {isRegistered ? 'Submit report' : 'Submit report (sign up next)'}
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xl },
  formHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  formSubheading: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.xs,
  },
  signupGate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  signupGateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
  },
  signupGateCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  signupGateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  signupGateHint: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  severityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  severityButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '800',
  },
  severityTextActive: {
    color: Colors.white,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  chips: { gap: Spacing.sm, paddingBottom: Spacing.xs, paddingTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  chipText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: Colors.white },
  locationCard: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  refreshText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  coords: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  locationHint: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  locationError: {
    fontSize: 13,
    color: Colors.red,
    lineHeight: 18,
  },
  locationInput: {
    marginTop: Spacing.xs,
    borderColor: Colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  photoText: { color: Colors.primary, fontWeight: '700' },
  previewWrap: {
    position: 'relative',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(26,26,26,0.45)',
    borderRadius: 12,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  submitText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
});
