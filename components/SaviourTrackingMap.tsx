import { useEffect, useRef } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

import {
  distanceKm,
  formatDistanceAway,
  googleMapsDirectionsUrl,
  mapsUrl,
} from '@/lib/location';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  requester: { latitude: number; longitude: number; label?: string };
  responder: { latitude: number; longitude: number; label?: string } | null;
  responderName: string;
  requesterName?: string;
  /** Larger map for the dedicated SOS tracking page. */
  expanded?: boolean;
};

function openInGoogleMaps(
  requester: { latitude: number; longitude: number },
  responder: { latitude: number; longitude: number } | null
) {
  const url = responder
    ? googleMapsDirectionsUrl(responder, requester)
    : mapsUrl(requester.latitude, requester.longitude);
  Linking.openURL(url).catch(() => undefined);
}

export function SaviourTrackingMap({
  requester,
  responder,
  responderName,
  requesterName = 'You',
  expanded = false,
}: Props) {
  const mapRef = useRef<MapView | null>(null);

  const distanceLabel =
    responder != null
      ? formatDistanceAway(
          distanceKm(
            { latitude: requester.latitude, longitude: requester.longitude },
            { latitude: responder.latitude, longitude: responder.longitude }
          )
        )
      : null;

  useEffect(() => {
    if (!responder || !mapRef.current) return;

    mapRef.current.fitToCoordinates(
      [
        { latitude: requester.latitude, longitude: requester.longitude },
        { latitude: responder.latitude, longitude: responder.longitude },
      ],
      {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      }
    );
  }, [
    requester.latitude,
    requester.longitude,
    responder?.latitude,
    responder?.longitude,
  ]);

  const openMaps = () => openInGoogleMaps(requester, responder);

  if (Platform.OS === 'web') {
    return (
      <Pressable
        style={[styles.fallback, expanded && styles.fallbackExpanded]}
        onPress={openMaps}>
        <Text style={styles.fallbackTitle}>{distanceLabel ?? 'Waiting for live location…'}</Text>
        <Text style={styles.fallbackBody}>
          {responder
            ? `${responderName} and ${requesterName} are ${distanceLabel ?? 'connected'} on this SOS.`
            : `${responderName} accepted this SOS. Live map opens on phone.`}
        </Text>
        <Text style={styles.fallbackHint}>Tap to open Google Maps</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrap, expanded && styles.wrapExpanded]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: requester.latitude,
          longitude: requester.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        onPress={openMaps}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}>
        <Marker
          coordinate={{ latitude: requester.latitude, longitude: requester.longitude }}
          title={requesterName}
          description={requester.label ?? 'SOS location'}
          pinColor={Colors.red}
          onCalloutPress={openMaps}
        />
        {responder ? (
          <>
            <Marker
              coordinate={{ latitude: responder.latitude, longitude: responder.longitude }}
              title={responderName}
              description="On the way"
              pinColor={Colors.primary}
              onCalloutPress={openMaps}
            />
            <Polyline
              coordinates={[
                { latitude: responder.latitude, longitude: responder.longitude },
                { latitude: requester.latitude, longitude: requester.longitude },
              ]}
              strokeColor={Colors.primary}
              strokeWidth={3}
            />
          </>
        ) : null}
      </MapView>

      <Pressable style={styles.overlay} onPress={openMaps}>
        <Text style={styles.overlayKicker}>LIVE TRACKING</Text>
        <Text style={styles.overlayTitle}>
          {distanceLabel ? `${distanceLabel} apart` : `${responderName} is connecting…`}
        </Text>
        <Text style={styles.overlayHint}>Tap map to open Google Maps · navigate</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.md,
    height: 220,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  wrapExpanded: {
    flex: 1,
    marginTop: 0,
    height: undefined,
    minHeight: 280,
    borderRadius: Radius.xl,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    left: Spacing.sm,
    right: Spacing.sm,
    top: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  overlayKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.primary,
  },
  overlayTitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  overlayHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  fallback: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.greenLight,
    gap: 4,
  },
  fallbackExpanded: {
    flex: 1,
    marginTop: 0,
    justifyContent: 'center',
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  fallbackBody: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  fallbackHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
