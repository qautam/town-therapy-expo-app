import { StyleSheet, Text, View } from 'react-native';

import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { brand } from '@/constants/data';
import { Spacing } from '@/constants/theme';

/** Soft silver-white for title on photo hero */
const TITLE_SILVER = '#F2F2F7';
const TAGLINE_SILVER = 'rgba(200, 200, 210, 0.88)';

export function HomeBrandHeader() {
  return (
    <View style={styles.wrap}>
      <TownTherapyLogo size={46} withShadow />
      <View style={styles.copy}>
        <Text style={styles.name}>{brand.name}</Text>
        <Text style={styles.tagline}>{brand.tagline}...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    color: TITLE_SILVER,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  tagline: {
    color: TAGLINE_SILVER,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    lineHeight: 15,
    marginLeft: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
