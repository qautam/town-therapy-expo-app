import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PublicSafetySection } from '@/components/PublicSafetySection';
import { useVolunteer } from '@/context/VolunteerContext';
import { REPORT_CATEGORIES } from '@/constants/reports';
import { api } from '@/lib/api';
import { formatCoords, getCurrentLocation } from '@/lib/location';
import { Colors, Radius, Spacing } from '@/constants/theme';

type GeoState = {
  latitude: number;
  longitude: number;
  label: string;
};

export default function NewReportScreen() {
  const router = useRouter();
  const { guestId, loading: volunteerLoading, refresh } = useVolunteer();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(REPORT_CATEGORIES[0].id);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [geo, setGeo] = useState<GeoState | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const category = useMemo(
    () => REPORT_CATEGORIES.find((item) => item.id === categoryId) ?? REPORT_CATEGORIES[0],
    [categoryId]
  );

  const captureLocation = useCallback(async () => {
    setLocating(true);
    setLocationError(null);

    try {
      const point = await getCurrentLocation();
      setGeo(point);
      setLocationLabel(point.label);
    } catch {
      setLocationError('Location permission is required to geotag your report.');
      setGeo(null);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    captureLocation();
  }, [captureLocation]);

  const pickPhoto = () => {
    Alert.alert('Add photo', 'Attach evidence of the issue nearby.', [
      {
        text: 'Take photo',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Camera access needed', 'Enable camera access to photograph the issue.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Photos access needed', 'Enable photo library access to attach an image.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (volunteerLoading || !guestId) {
      Alert.alert('Please wait', 'Your profile is still loading. Try again in a moment.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing details', 'Add a short title describing the issue.');
      return;
    }

    if (!geo) {
      Alert.alert(
        'Location required',
        'Reports must be geotagged so the town can act on them. Refresh your location or enter one manually.'
      );
      return;
    }

    setLoading(true);
    try {
      await api.createReport(guestId, {
        title: title.trim(),
        description: description.trim(),
        category: category.label,
        location_label: locationLabel.trim() || geo.label,
        latitude: geo.latitude,
        longitude: geo.longitude,
        photo_uri: photoUri ?? undefined,
      });

      await refresh();
      Alert.alert('Report submitted', 'Thanks for helping improve Hazaribagh.');
      router.back();
    } catch (error) {
      Alert.alert('Could not submit', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.formHeading}>Report a civic issue</Text>
        <Text style={styles.formSubheading}>
          Waste, traffic, potholes, streetlights, governance — geotagged for the town.
        </Text>

        <Text style={styles.sectionLabel}>Issue type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {REPORT_CATEGORIES.map((item) => {
            const active = categoryId === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategoryId(item.id)}>
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={active ? Colors.white : Colors.primary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Issue title"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={category.placeholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          value={description}
          onChangeText={setDescription}
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
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                  <Text style={styles.refreshText}>Refresh</Text>
                </>
              )}
            </Pressable>
          </View>

          {geo ? (
            <>
              <Text style={styles.coords}>{formatCoords(geo.latitude, geo.longitude)}</Text>
              <Text style={styles.locationHint}>Pin this report to the spot you are reporting from.</Text>
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
            onChangeText={setLocationLabel}
          />
        </View>

        <Text style={styles.sectionLabel}>Photo evidence</Text>
        <Pressable style={styles.photoButton} onPress={pickPhoto}>
          <Ionicons name="camera-outline" size={22} color={Colors.primary} />
          <Text style={styles.photoText}>{photoUri ? 'Change photo' : 'Add photo'}</Text>
        </Pressable>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

        <Pressable style={styles.submit} onPress={submit} disabled={loading || locating}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="megaphone-outline" size={18} color={Colors.white} />
              <Text style={styles.submitText}>Submit report</Text>
            </>
          )}
        </Pressable>

        <View style={styles.divider} />
        <PublicSafetySection
          guestId={guestId}
          geo={geo}
          locating={locating}
          locationError={locationError}
          onRefreshLocation={captureLocation}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xl },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  formHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  formSubheading: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.xs,
  },
  sectionLabel: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  chips: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: Colors.white },
  locationCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.greenLight,
  },
  refreshText: {
    color: Colors.primary,
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
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenLight,
  },
  photoText: { color: Colors.primary, fontWeight: '600' },
  preview: { width: '100%', height: 180, borderRadius: Radius.lg },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    marginTop: Spacing.md,
  },
  submitText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
