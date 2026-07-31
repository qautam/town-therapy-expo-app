export const Colors = {
  /** Town Therapy brand identity */
  primary: '#2D4F4F',
  primaryDark: '#243F3F',
  primaryLight: '#3A6565',
  /** Bright teal for taglines on photo surfaces */
  brandTeal: '#7ADEDD',
  /** Soft green page canvas — keeps brand, stays readable */
  background: '#E8EFEF',
  card: '#F3EDE3',
  cardLight: '#FAF7F2',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9A9A9A',
  border: '#C5D4D4',
  orange: '#E8874A',
  orangeLight: '#FDF0E6',
  greenLight: '#E8EFEF',
  red: '#C0392B',
  redLight: '#FCEAE8',
  pinkLight: '#FCE8EC',
  tealLight: '#E0EBEB',
  goldLight: '#FDF6E3',
  locked: '#D5D0C8',
  /** Readable silver accents on dark / orange surfaces */
  silver: '#C8C8D4',
  silverBright: '#F2F2F7',
  silverMuted: '#8E8E98',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const Typography = {
  hero: { fontSize: 28, fontWeight: '700' as const },
  title: { fontSize: 26, fontWeight: '700' as const },
  heading: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8 },
};
